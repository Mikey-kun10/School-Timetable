"use client";

import { Field, SubmitBtn } from "@/components/ui/FormFields";
import { College } from "@/lib/types";

interface Props {
  initial?: College;
  onSubmit: (data: College) => void;
  loading?: boolean;
}

export default function CollegeForm({ initial, onSubmit, loading }: Props) {
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
          label="College Name"
          name="name"
          defaultValue={initial?.name}
          placeholder="e.g. Science"
          required
        />
        <Field
          label="Code"
          name="code"
          defaultValue={initial?.code}
          placeholder="e.g. COCCS"
          required
        />
      </div>

      <SubmitBtn loading={loading} />
    </form>
  );
}
