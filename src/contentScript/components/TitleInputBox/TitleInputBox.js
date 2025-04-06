import React from 'react';
import PropTypes from 'prop-types';
import { INPUT_BOX_ID } from "../../../config";
import styles from './TitleInputBox.module.css';

export default function TitleInputBox({ inputBoxValue, setInputBoxValue, handleInputBoxKeydown, inputRef }) {
    return (
        <input
            type="text"
            id={INPUT_BOX_ID}
            className={styles.inputBox}
            placeholder="New Tab Title"
            autoComplete="off"
            value={inputBoxValue}
            onChange={(event) => setInputBoxValue(event.target.value)}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={handleInputBoxKeydown}
            ref={inputRef}
        />
    )
}

TitleInputBox.propTypes = {
    inputBoxValue: PropTypes.string.isRequired,
    setInputBoxValue: PropTypes.func.isRequired,
    handleInputBoxKeydown: PropTypes.func.isRequired,
    inputRef: PropTypes.object.isRequired,
};
