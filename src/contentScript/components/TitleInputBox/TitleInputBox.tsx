import React from 'react';
import { INPUT_BOX_ID } from "../../../config";
import styles from './TitleInputBox.module.css';

interface TitleInputBoxProps {
    inputBoxValue: string;
    setInputBoxValue: (value: string) => void;
    handleInputBoxKeydown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
    inputRef: React.RefObject<HTMLInputElement>;
}

export default function TitleInputBox({ inputBoxValue, setInputBoxValue, handleInputBoxKeydown, inputRef }: TitleInputBoxProps) {
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

