import type { DrawShape } from '@lichess-org/chessground/draw';
import type * as cg from '@lichess-org/chessground/types';
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { AutoQueen } from '../src/prefs';
import { PromotionCtrl, promotionRules } from '../src/game/promotion';

function makeGround(
  pieces: Array<[cg.Key, cg.Piece]> = [['e7', { color: 'white', role: 'pawn' }]],
  turnColor: cg.Color = 'black',
  orientation: cg.Color = 'white',
) {
  const state = {
    pieces: new Map<cg.Key, cg.Piece>(pieces),
    turnColor,
    orientation,
  };
  let autoShapes: DrawShape[] = [];
  const ground = {
    state,
    setAutoShapes(shapes: DrawShape[]) {
      autoShapes = shapes;
    },
    setPieces(pieces: Map<cg.Key, cg.Piece | undefined>) {
      for (const [key, piece] of pieces) {
        if (piece) state.pieces.set(key, piece);
        else state.pieces.delete(key);
      }
    },
  } as unknown as CgApi;

  return {
    ground,
    autoShapes: () => autoShapes,
  };
}

describe('promotion control', () => {
  test('dismiss clears a visible promotion choice without running the cancel hook', () => {
    const { ground } = makeGround();
    let redraws = 0;
    let cancels = 0;
    const shownRoles: Array<cg.Role[] | false> = [];
    const ctrl = new PromotionCtrl(
      f => f(ground),
      () => {
        cancels++;
      },
      () => {
        redraws++;
      },
    );

    assert.equal(
      ctrl.start('e7', 'e8', {
        submit: () => assert.fail('promotion should not submit while waiting for a role'),
        show: (_ctrl, roles) => shownRoles.push(roles),
      }),
      true,
    );
    assert.ok(ctrl.view());

    assert.equal(ctrl.dismiss(), true);
    assert.equal(cancels, 0);
    assert.equal(redraws, 2);
    assert.deepEqual(shownRoles.at(-1), false);
    assert.equal(ctrl.view(), undefined);
  });

  test('dismiss ignores stale promotion choices fired during hook cleanup', () => {
    const { ground, autoShapes } = makeGround();
    let submits = 0;
    const ctrl = new PromotionCtrl(
      f => f(ground),
      () => {},
      () => {},
    );

    assert.equal(
      ctrl.start('e7', 'e8', {
        submit: () => {
          submits++;
        },
        show: (activeCtrl, roles) => {
          if (roles === false) activeCtrl.finish('queen');
        },
      }),
      true,
    );
    assert.ok(ctrl.view());

    assert.equal(ctrl.dismiss(), true);
    assert.equal(submits, 0);
    assert.equal(autoShapes().length, 0);
    assert.equal(ctrl.view(), undefined);
  });

  test('cancel keeps the existing cancel hook behavior', () => {
    const { ground } = makeGround();
    let cancels = 0;
    const ctrl = new PromotionCtrl(
      f => f(ground),
      () => {
        cancels++;
      },
      () => {},
    );

    assert.equal(ctrl.start('e7', 'e8', { submit: () => assert.fail('promotion should not submit') }), true);

    ctrl.cancel();

    assert.equal(cancels, 1);
    assert.equal(ctrl.view(), undefined);
  });

  test('dismiss clears a stored premove promotion role', () => {
    const { ground, autoShapes } = makeGround();
    let cancels = 0;
    const ctrl = new PromotionCtrl(
      f => f(ground),
      () => {
        cancels++;
      },
      () => {},
    );

    assert.equal(ctrl.start('e7', 'e8', { submit: () => assert.fail('promotion should not submit') }), true);
    ctrl.finish('queen');
    assert.equal(autoShapes().length, 1);

    assert.equal(ctrl.dismiss(), false);
    assert.equal(cancels, 0);
    assert.equal(autoShapes().length, 0);
  });
});

describe('early promotion (Informant Chess)', () => {
  const informant = promotionRules('informantChess');
  const whitePawn: cg.Piece = { color: 'white', role: 'pawn' };
  const blackPawn: cg.Piece = { color: 'black', role: 'pawn' };

  // A pawn sitting on the DESTINATION is a completed move; a pawn still on the
  // ORIGIN is a premove that chessground has not played yet.
  const afterMove = (square: cg.Key, piece: cg.Piece = whitePawn, turnColor: cg.Color = 'black') =>
    makeGround([[square, piece]], turnColor);

  function offer(ctrl: PromotionCtrl, orig: cg.Key, dest: cg.Key) {
    const shown: Array<cg.Role[] | false> = [];
    const submitted: Array<cg.Role | undefined> = [];
    const opened = ctrl.start(orig, dest, {
      submit: (_o, _d, role) => submitted.push(role),
      show: (_ctrl, roles) => shown.push(roles),
    });
    ctrl.view();
    return { opened, roles: shown.at(-1), submitted };
  }

  test('a pawn arriving on the 7th offers rook, bishop, knight and the pawn itself', () => {
    const { ground } = afterMove('e7');
    const ctrl = new PromotionCtrl(f => f(ground), () => {}, () => {}, AutoQueen.Never, informant);

    const { opened, roles } = offer(ctrl, 'e6', 'e7');

    assert.equal(opened, true);
    assert.deepEqual(roles, ['rook', 'bishop', 'knight', 'pawn']);
  });

  test('the queen is never offered on the 7th', () => {
    const { ground } = afterMove('e7');
    const ctrl = new PromotionCtrl(f => f(ground), () => {}, () => {}, AutoQueen.Never, informant);

    const { roles } = offer(ctrl, 'e6', 'e7');

    assert.ok(roles);
    assert.equal((roles as cg.Role[]).includes('queen'), false);
  });

  test('declining submits the plain push rather than cancelling the move', () => {
    const { ground } = afterMove('e7');
    let cancels = 0;
    const ctrl = new PromotionCtrl(
      f => f(ground),
      () => {
        cancels++;
      },
      () => {},
      AutoQueen.Never,
      informant,
    );

    const { submitted } = offer(ctrl, 'e6', 'e7');
    ctrl.finish('pawn');

    assert.deepEqual(submitted, [undefined], 'the push must reach the server');
    assert.equal(cancels, 0, 'declining is not a cancel');
    assert.equal(ctrl.view(), undefined);
    assert.deepEqual(ground.state.pieces.get('e7'), whitePawn, 'the pawn stays a pawn');
  });

  test('choosing a piece promotes it on the board and submits the role', () => {
    const { ground } = afterMove('e7');
    const ctrl = new PromotionCtrl(f => f(ground), () => {}, () => {}, AutoQueen.Never, informant);

    const { submitted } = offer(ctrl, 'e6', 'e7');
    ctrl.finish('rook');

    assert.deepEqual(submitted, ['rook']);
    assert.equal(ground.state.pieces.get('e7')?.role, 'rook');
  });

  test('the 8th rank is unchanged and still offers the queen', () => {
    const { ground } = afterMove('e8');
    const ctrl = new PromotionCtrl(f => f(ground), () => {}, () => {}, AutoQueen.Never, informant);

    const { opened, roles } = offer(ctrl, 'e7', 'e8');

    assert.equal(opened, true);
    assert.deepEqual(roles, ['queen', 'knight', 'rook', 'bishop']);
  });

  test('auto-queen does not resolve an early promotion', () => {
    const { ground } = afterMove('e7');
    const ctrl = new PromotionCtrl(f => f(ground), () => {}, () => {}, AutoQueen.Always, informant);

    const { opened, submitted } = offer(ctrl, 'e6', 'e7');

    assert.equal(opened, true);
    assert.deepEqual(submitted, [], 'nothing may be submitted without the player choosing');
    assert.ok(ctrl.view(), 'the dialog stays open');
  });

  test('auto-queen still resolves a last-rank promotion', () => {
    const { ground } = afterMove('e8');
    const ctrl = new PromotionCtrl(f => f(ground), () => {}, () => {}, AutoQueen.Always, informant);

    const { submitted } = offer(ctrl, 'e7', 'e8');

    assert.deepEqual(submitted, ['queen']);
  });

  test('black promotes early on the 2nd rank', () => {
    const { ground } = afterMove('e2', blackPawn, 'white');
    const ctrl = new PromotionCtrl(f => f(ground), () => {}, () => {}, AutoQueen.Never, informant);

    const { opened, roles } = offer(ctrl, 'e3', 'e2');

    assert.equal(opened, true);
    assert.deepEqual(roles, ['rook', 'bishop', 'knight', 'pawn']);
  });

  // The choice stack used to assume the promotion square was the board edge. These
  // pin the generalised anchor: unchanged for last-rank promotions in either
  // orientation, and starting on the destination for early ones.
  const tops = (vnode: unknown): number[] =>
    ((vnode as { children: Array<{ data: { attrs: { style: string } } }> }).children ?? []).map(
      child => parseFloat(child.data.attrs.style.match(/top: ([\d.]+)%/)![1]),
    );

  function stack(rules: ReturnType<typeof promotionRules>, ground: CgApi, orig: cg.Key, dest: cg.Key) {
    const ctrl = new PromotionCtrl(f => f(ground), () => {}, () => {}, AutoQueen.Never, rules);
    ctrl.start(orig, dest, { submit: () => {} });
    return tops(ctrl.view());
  }

  test('the choice stack is anchored on the destination square', () => {
    // White to promote, board seen from White: rank 8 is the top row, rank 7 the next.
    assert.deepEqual(stack(informant, afterMove('e8').ground, 'e7', 'e8'), [0, 12.5, 25, 37.5]);
    assert.deepEqual(stack(informant, afterMove('e7').ground, 'e6', 'e7'), [12.5, 25, 37.5, 50]);
  });

  test('the anchor is unchanged for last-rank promotions seen from black', () => {
    const { ground } = makeGround([['e8', whitePawn]], 'black', 'black');
    assert.deepEqual(stack(informant, ground, 'e7', 'e8'), [87.5, 75, 62.5, 50]);
  });

  test('standard chess ignores the 7th rank entirely', () => {
    const { ground } = afterMove('e7');
    const ctrl = new PromotionCtrl(
      f => f(ground),
      () => {},
      () => {},
      AutoQueen.Never,
      promotionRules('standard'),
    );

    const { opened } = offer(ctrl, 'e6', 'e7');

    assert.equal(opened, false, 'no dialog, so the push is submitted by the caller as usual');
  });
});
