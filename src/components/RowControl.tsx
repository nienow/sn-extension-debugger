import React, {useState} from 'react';
import snApi from "../api/snApi";

const RowControl = () => {
    const [rows, setRows] = useState(snApi.meta?.rows || 3);

    const changeRows = (newRows: number) => {
        setRows(newRows);
        snApi.meta = {rows: newRows};
    };

    return (
        <div>
            <button disabled={snApi.locked} onClick={() => changeRows(rows - 1)}>-</button>
            <span> {rows} Rows </span>
            <button disabled={snApi.locked} onClick={() => changeRows(rows + 1)}>+</button>
            <span> (This is an example of saving note metadata).</span>
        </div>
    );
}

export default RowControl
