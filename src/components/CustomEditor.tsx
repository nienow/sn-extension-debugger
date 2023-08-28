import React, {useState} from 'react';
import {useEffect} from "preact/compat";
import snApi from "../relay/ComponentRelay";

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
                {snApi.text}
            </div>
        );
    } else {
        return <div>Not ready yet</div>;
    }

}

export default CustomEditor
