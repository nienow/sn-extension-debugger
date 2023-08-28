import React from 'react';

const LogOutput = ({logs}) => {

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
