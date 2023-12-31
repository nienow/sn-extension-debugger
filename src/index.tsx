import React from 'react';

import './index.scss';
import {createRoot} from "react-dom/client";
import {StrictMode} from "preact/compat";
import LogOutput from "./components/LogOutput";
import {snApi} from "./relay/ComponentRelay";
import CustomEditor from "./components/CustomEditor";

const root = createRoot(document.getElementById('root'));
export const output_logs: (string | Error)[] = ['start'];

root.render(
  <StrictMode>
    <CustomEditor/>
    <LogOutput></LogOutput>
  </StrictMode>
);

snApi.initialize({
  debounceSave: 400
});

snApi.subscribe((note) => {
  // all_logs.push('got note: ' + JSON.stringify(note));
});


// snApi.initialize({
//     debounceSave: 400,
//     logObserver: (msgOrError) => {
//         output_logs.push(msgOrError);
//     }
// });
