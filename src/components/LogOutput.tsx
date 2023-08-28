import React, {useState} from 'react';
import {useEffect} from "preact/compat";
import {all_logs} from "../relay/Logger";
// import {output_logs} from "../index";

const LogOutput = () => {
    const [logs, setLogs] = useState([]);

    useEffect(() => {
        setInterval(() => {
            setLogs([...all_logs]);
        }, 1000);
    }, []);

    return (
        <div>
            {
                logs.map((log, i) => {
                    return <div key={i}>{log}</div>
                })
            }
        </div>
    );
}

export default LogOutput
