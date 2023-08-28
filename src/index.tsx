import React from 'react';

import './index.scss';
import {createRoot} from "react-dom/client";
import snApi from "./api/snApi";
import LogOutput from "./components/LogOutput";

const root = createRoot(document.getElementById('root'));
const logs = [];
let debounce;

export const rerenderRoot = () => {
  root.render(
    <LogOutput logs={logs}/>
  );
};

snApi.initialize({
  debounceSave: 400,
  logObserver: (msgOrError) => {
    logs.push(msgOrError);
    if (debounce) {
      clearTimeout(debounce);
    }
    debounce = setTimeout(() => {
      rerenderRoot();
    }, 1000);
  }
});

snApi.subscribe(() => {
  rerenderRoot();
});
