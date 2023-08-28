import React from 'react';

import './index.scss';
import {createRoot} from "react-dom/client";
import CustomEditor from "./components/CustomEditor";
import snApi from "./api/snApi";

const root = createRoot(document.getElementById('root'));
const logs = [];
let debounce;

export const rerenderRoot = () => {
  root.render(
    <React.StrictMode>
      <CustomEditor logs={logs}/>
    </React.StrictMode>
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
