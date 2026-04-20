"use client";

import Modal from "@/components/ui/Modal";
import CSVUploader, { type CSVUploaderProps } from "@/components/ui/CSVUploader";

interface Props<T extends object> extends CSVUploaderProps<T> {    open: boolean;
    onClose: () => void;
    onDone: () => void;
}

export default function CSVUploadModal<T extends object>({    open, onClose, onDone, ...uploaderProps
}: Props<T>) {
    return (
        <Modal
            title={`Import ${uploaderProps.entityName}s from CSV`}
            open={open}
            onClose={onClose}
        >
            <CSVUploader
                {...uploaderProps}
                onUpload={async (rows) => {
                    const result = await uploaderProps.onUpload(rows);
                    if (result.saved > 0) onDone();
                    return result;
                }}
            />
        </Modal>
    );
}