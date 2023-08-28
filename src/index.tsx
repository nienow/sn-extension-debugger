import React from 'react';

import './index.scss';
import {createRoot} from "react-dom/client";
import snApi from "./api/snApi";
import {StrictMode} from "preact/compat";
import CustomEditor from "./components/CustomEditor";
import LogOutput from "./components/LogOutput";

const root = createRoot(document.getElementById('root'));
export const output_logs: (string | Error)[] = ['start'];

root.render(
  <StrictMode>
    <CustomEditor/>
    <LogOutput></LogOutput>
  </StrictMode>
);


snApi.initialize({
  debounceSave: 400,
  logObserver: (msgOrError) => {
    output_logs.push(msgOrError);
  }
});
