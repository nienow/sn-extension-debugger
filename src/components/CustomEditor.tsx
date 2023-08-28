import React, {useState} from 'react';
import TextArea from "./TextArea";
import RowControl from "./RowControl";
import SpacingControl from "./SpacingControl";
import snApi from "../api/snApi";
import LogOutput from "./LogOutput";
import {useEffect} from "preact/compat";

const CustomEditor = () => {
  const [render, setRender] = useState(0);

  useEffect(() => {
    snApi.subscribe(() => {
      setRender(render + 1);
    });
  }, []);

  if (render) {
    return (
      <div>
        <SpacingControl/>
        <RowControl/>
        <TextArea/>
        <LogOutput></LogOutput>
      </div>
    );
  } else {
    return <div>Not ready yet</div>;
  }

}

export default CustomEditor
