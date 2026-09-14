import type { MoveMetadata } from '@lichess-org/chessground/types';
import { opposite, key2pos } from '@lichess-org/chessground/util';
import { h } from 'snabbdom';

import { AutoQueen } from '@/prefs';
import { type MaybeVNode, bind, onInsert } from '@/view';

import type { WithGround } from './ground';

export type Hooks = {
  /** `role` is undefined when the player declined an early promotion: the plain
   *  pawn push must still be submitted, not cancelled. */
  submit: (orig: Key, dest: Key, role: Role | undefined) => void;
  show?: (ctrl: PromotionCtrl, roles: Role[] | false) => void;
};

interface Promoting {
  orig: Key;
  dest: Key;
  pre: boolean;
  hooks: Hooks;
  /** Which role set this dialog is offering, and therefore whether declining is
   *  possible at all. */
  roles: Role[];
}

const PROMOTABLE_ROLES: Role[] = ['queen', 'knight', 'rook', 'bishop'];

/** What a variant offers when a pawn arrives somewhere promotable.
 *
 * `early` is for variants that promote before the last rank. It carries the
 * decline option as the literal role 'pawn' — the pawn push is itself a legal
 * move there, so the dialog has three outcomes (promote, push, abandon) where the
 * last-rank dialog has two. Rendering the choice as a pawn keeps that in the grid
 * the player is already looking at, and leaves background-click meaning "abandon".
 */
export interface PromotionRules {
  readonly last: Role[];
  readonly early: Role[];
}

const STANDARD_RULES: PromotionRules = { last: PROMOTABLE_ROLES, early: [] };

const RULES_BY_VARIANT: Partial<Record<VariantKey, PromotionRules>> = {
  antichess: { last: [...PROMOTABLE_ROLES, 'king'], early: [] },
  // A pawn reaching the 7th rank may promote to anything but a queen, or push on
  // and promote normally on the 8th.
  informantChess: { last: PROMOTABLE_ROLES, early: ['rook', 'bishop', 'knight', 'pawn'] },
};

export const promotionRules = (variant: VariantKey): PromotionRules =>
  RULES_BY_VARIANT[variant] ?? STANDARD_RULES;

export function promote(g: CgApi, key: Key, role: Role): void {
  const piece = g.state.pieces.get(key);
  if (piece?.role === 'pawn') g.setPieces(new Map([[key, { color: piece.color, role, promoted: true }]]));
}

export class PromotionCtrl {
  private promoting?: Promoting;
  private prePromotionRole?: Role;

  constructor(
    private readonly withGround: WithGround,
    private readonly onCancel: () => void,
    private readonly redraw: Redraw,
    private readonly autoQueenPref: AutoQueen = AutoQueen.Never,
    private readonly rules: PromotionRules = STANDARD_RULES,
  ) {}

  /** The roles on offer for a pawn arriving on `dest`, or undefined if that square
   *  does not promote. `turnColor` has already flipped to the mover's opponent by
   *  the time this is called, for real moves and premoves alike. */
  private rolesFor(dest: Key, turnColor: Color): Role[] | undefined {
    const rank = dest[1];
    if ((rank === '8' && turnColor === 'black') || (rank === '1' && turnColor === 'white'))
      return this.rules.last;
    if (this.rules.early.length && ((rank === '7' && turnColor === 'black') || (rank === '2' && turnColor === 'white')))
      return this.rules.early;
    return undefined;
  }

  start = (orig: Key, dest: Key, hooks: Hooks, meta?: MoveMetadata, forceAutoQueen = false): boolean =>
    this.withGround(g => {
      const premovePiece = g.state.pieces.get(orig);
      const piece = premovePiece || g.state.pieces.get(dest);
      const roles = piece?.role === 'pawn' ? this.rolesFor(dest, g.state.turnColor) : undefined;
      if (roles) {
        if (this.prePromotionRole && meta?.premove) {
          this.doPromote({ orig, dest, hooks, roles }, this.prePromotionRole);
          return true;
        }
        // Auto-queen is a last-rank convenience. An early promotion has no queen to
        // pick and pushing on is a real choice, so never resolve it automatically.
        if (
          roles.includes('queen') &&
          !meta?.ctrlKey &&
          !this.promoting &&
          (this.autoQueenPref === AutoQueen.Always ||
            (this.autoQueenPref === AutoQueen.OnPremove && premovePiece) ||
            forceAutoQueen)
        ) {
          if (premovePiece) this.setPrePromotion(dest, 'queen');
          else this.doPromote({ orig, dest, hooks, roles }, 'queen');
          return true;
        }
        this.promoting = { orig, dest, pre: !!premovePiece, hooks, roles };
        this.redraw();
        return true;
      }
      return false;
    }) || false;

  cancel = (): void => {
    if (this.dismiss()) this.onCancel();
  };

  dismiss = (): boolean => {
    const promoting = this.promoting;
    this.promoting = undefined;
    this.cancelPrePromotion(promoting);
    if (promoting) {
      this.redraw();
    }
    return !!promoting;
  };

  cancelPrePromotion = (promoting: Promoting | undefined = this.promoting): void => {
    promoting?.hooks.show?.(this, false);
    if (this.prePromotionRole) {
      this.withGround(g => g.setAutoShapes([]));
      this.prePromotionRole = undefined;
      this.redraw();
    }
  };

  view = (): MaybeVNode => {
    const promoting = this.promoting;
    if (!promoting) return undefined;
    promoting.hooks.show?.(this, promoting.roles);

    return (
      this.withGround(g =>
        this.renderPromotion(
          promoting.dest,
          promoting.roles,
          opposite(g.state.turnColor),
          g.state.orientation,
        ),
      ) || null
    );
  };

  finish(role: Role): void {
    const promoting = this.promoting;
    if (promoting) {
      this.promoting = undefined;
      // 'pawn' is the decline option on an early promotion. The push is already on
      // the board, so there is nothing to promote — just submit it as a plain move.
      // As a premove it needs no pre-promotion role either; chessground has it.
      if (role === 'pawn') {
        if (!promoting.pre) promoting.hooks.submit(promoting.orig, promoting.dest, undefined);
      } else if (promoting.pre) this.setPrePromotion(promoting.dest, role);
      else this.doPromote(promoting, role);
      promoting.hooks.show?.(this, false);
      this.redraw();
    }
  }

  private doPromote(promoting: Omit<Promoting, 'pre'>, role: Role): void {
    this.withGround(g => promote(g, promoting.dest, role));
    promoting.hooks.submit(promoting.orig, promoting.dest, role);
  }

  private setPrePromotion(dest: Key, role: Role): void {
    this.prePromotionRole = role;
    this.withGround(g =>
      g.setAutoShapes([
        {
          orig: dest,
          piece: { color: opposite(g.state.turnColor), role },
          brush: '',
        },
      ]),
    );
  }

  private renderPromotion(dest: Key, pieces: Role[], color: Color, orientation: Color): MaybeVNode {
    let left = (7 - key2pos(dest)[0]) * 12.5;
    if (orientation === 'white') left = 87.5 - left;

    const vertical = color === orientation ? 'top' : 'bottom';

    // Anchor the stack on the destination square and grow away from the near edge,
    // rather than assuming the destination IS the edge square. Identical to the old
    // behaviour for last-rank promotions; correct for early ones too.
    const destRow = orientation === 'white' ? 7 - key2pos(dest)[1] : key2pos(dest)[1];
    const growsDown = color === orientation;

    return h(
      'div#promotion-choice.' + vertical,
      {
        hook: onInsert(el => {
          el.addEventListener('click', this.cancel);
          el.oncontextmenu = () => false;
        }),
      },
      pieces.map((serverRole, i) => {
        const top = (growsDown ? destRow + i : destRow - i) * 12.5;
        return h(
          'square',
          {
            attrs: { style: 'top: ' + top + '%;left: ' + left + '%' },
            hook: bind('click', e => {
              e.stopPropagation();
              this.finish(serverRole);
            }),
          },
          [h('piece.' + serverRole + '.' + color)],
        );
      }),
    );
  }
}
