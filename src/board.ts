enum BoardState {
    Open,
    Draw,
    Player0,
    Player1,
}

const WINNING_COMBINATION = [
    new Set([0, 1, 2]),
    new Set([3, 4, 5]),
    new Set([6, 7, 8]),
    new Set([0, 3, 6]),
    new Set([1, 4, 7]),
    new Set([2, 5, 8]),
    new Set([0, 4, 8]),
    new Set([2, 4, 6]),
];

class Board {
    boardState = BoardState.Open;
    player0Square = new Set<number>();
    player1Square = new Set<number>();

    updateBoard(player: 0 | 1, coordinate: number) {
        if (coordinate < 0 || coordinate > 8)
            throw RangeError("Coordinate out of range");
        if (player != 0 && player != 1)
            throw RangeError("Player value out of range");
        if (this.boardState != BoardState.Open)
            throw Error("Board is Completed");
        if (
            coordinate in this.player0Square ||
            coordinate in this.player1Square
        )
            throw Error("Square already occupied");
        const board = player == 0 ? this.player0Square : this.player1Square;
        board.add(coordinate);

        for (let pattern of WINNING_COMBINATION) {
            if (pattern.isSubsetOf(board)) {
                this.boardState =
                    player == 0 ? BoardState.Player0 : BoardState.Player1;
                break;
            }
        }

        if (this.player0Square.size + this.player1Square.size == 9)
            this.boardState = BoardState.Draw;
    }
}
