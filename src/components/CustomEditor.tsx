import React, {useState} from 'react';
import snApi from "../api/snApi";
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
                Hello World
            </div>
        );
    } else {
        return <div>Not ready yet</div>;
    }

}

export default CustomEditor
