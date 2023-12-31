import React, {useState} from 'react';
import snApi from "../api/snApi";

const options = ['Cozy', 'Default', 'Comfortable'];

const SpacingControl = () => {
  const [spacing, setSpacing] = useState(snApi.extensionMeta?.spacing || 'Default');

  const changeSpacing = (e) => {
    const newSpacing = e.target.value;
    setSpacing(newSpacing);
    snApi.extensionMeta = {spacing: newSpacing};
  };

  return (
    <div>
      <span>Spacing: </span>
      <select onChange={changeSpacing}>
        {
          options.map(o => {
            if (spacing === o) {
              return <option selected>{o}</option>
            } else {
              return <option>{o}</option>
            }
          })
        }
      </select>
      <span> (This is an example of saving extension metadata).</span>
    </div>
  );
}

export default SpacingControl
