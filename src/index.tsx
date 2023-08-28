import React from 'react';

import './index.scss';
import {createRoot} from "react-dom/client";
import snApi from "./api/snApi";
import LogOutput from "./components/LogOutput";

const root = createRoot(document.getElementById('root'));
export const output_logs: (string | Error)[] = ['start'];

root.render(
  <LogOutput/>
);

snApi.initialize({
  debounceSave: 400,
  logObserver: (msgOrError) => {
    output_logs.push(msgOrError);
  }
});

// snApi.subscribe(() => {
//   rerenderRoot();
// });
