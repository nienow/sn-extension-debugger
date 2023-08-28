import React, {useState} from 'react';
import {useEffect} from "preact/compat";
import {output_logs} from "../index";

const LogOutput = () => {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    setInterval(() => {
      setLogs(output_logs);
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
