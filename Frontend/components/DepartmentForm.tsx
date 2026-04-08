"use client";

import { Field, SubmitBtn } from "@/components/ui/FormFields";

interface DepartmentData {
  id?: number;
  name: string;
  code: string;
}

interface Props {
  initial?: DepartmentData;
  onSubmit: (data: DepartmentData) => void;
  loading?: boolean;
}

export default function DepartmentForm({ initial, onSubmit, loading }: Props) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        onSubmit({
          name: fd.get("name") as string,
          code: (fd.get("code") as string).toUpperCase(),
        });
      }}
      className="space-y-4"
    >
      <div className="grid grid-cols-2 gap-4">
        <Field
          label="Department Name"
          name="name"
          defaultValue={initial?.name}
          placeholder="e.g. Computer Science"
          required
        />
        <Field
          label="Code"
          name="code"
          defaultValue={initial?.code}
          placeholder="e.g. CS"
          required
        />
      </div>

      <SubmitBtn loading={loading} />
    </form>
  );
}