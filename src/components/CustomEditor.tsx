import React from 'react';
import TextArea from "./TextArea";
import RowControl from "./RowControl";
import SpacingControl from "./SpacingControl";
import snApi from "../api/snApi";
import LogOutput from "./LogOutput";

const CustomEditor = ({logs}) => {
  const spacing = snApi.extensionMeta?.spacing || 'Default';

  return (
    <div className={'main__' + spacing}>
      <SpacingControl/>
      <RowControl/>
      <TextArea/>
      <LogOutput logs={logs}></LogOutput>
    </div>
  );
}

export default CustomEditor
