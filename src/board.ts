export const WINNING_COMBINATIONS = [
    new Set([0, 1, 2]),
    new Set([3, 4, 5]),
    new Set([6, 7, 8]),
    new Set([0, 3, 6]),
    new Set([1, 4, 7]),
    new Set([2, 5, 8]),
    new Set([0, 4, 8]),
    new Set([2, 4, 6]),
];

type NulPlayer = 0 | 1 | null;

export class Board {
    cells: NulPlayer[] = Array(9).fill(null);
    winner: 0 | 1 | 2 | null = null;

    constructor(cells?: NulPlayer[], winner?: 0 | 1 | 2 | null) {
        if (cells !== undefined && cells.length == 9) this.cells = cells;
        if (winner !== undefined) this.winner = winner;
    }

    public checkState(): 0 | 1 | 2 | null {
        // Check if board is won
        const player0 = new Set();
        const player1 = new Set();
        for (const [index, squareStatus] of this.cells.entries()) {
            if (squareStatus === 0) player0.add(index);
            if (squareStatus === 1) player1.add(index);
        }
        for (const combination of WINNING_COMBINATIONS) {
            if (combination.isSubsetOf(player0)) {
                this.winner = 0;
                return 0;
            }
            if (combination.isSubsetOf(player1)) {
                this.winner = 1;
                return 1;
            }
        }
        if (player0.size + player1.size == 9) {
            this.winner = 2;
            return 2;
        }
        return null;
    }
}
