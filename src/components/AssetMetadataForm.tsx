"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AssetMetadataFields } from "@/lib/asset-metadata-form";

type AssetMetadataFormProps = {
  fields: AssetMetadataFields;
  onChange: (fields: AssetMetadataFields) => void;
};

export function AssetMetadataForm({ fields, onChange }: AssetMetadataFormProps) {
  const update = (field: keyof AssetMetadataFields, value: string) => {
    onChange({ ...fields, [field]: value });
  };

  return (
    <>
      <div>
        <Label>Name</Label>
        <Input value={fields.name} onChange={(event) => update("name", event.target.value)} placeholder="Name" />
      </div>
      <div>
        <Label>Description</Label>
        <Input value={fields.description} onChange={(event) => update("description", event.target.value)} placeholder="Description" />
      </div>
      <div>
        <Label>Creator</Label>
        <Input value={fields.creator} onChange={(event) => update("creator", event.target.value)} placeholder="Creator" />
      </div>
      <div>
        <Label>Notes</Label>
        <Input value={fields.notes} onChange={(event) => update("notes", event.target.value)} placeholder="Notes" />
      </div>
      <div className="flex flex-row items-center justify-between space-x-2">
        <div>
          <Label>Content Type</Label>
          <Input value={fields.contentType} onChange={(event) => update("contentType", event.target.value)} />
        </div>
        <div>
          <Label>Encoding</Label>
          <Input value={fields.encoding} onChange={(event) => update("encoding", event.target.value)} />
        </div>
      </div>
      <div>
        <Label>Keywords <span className="text-xs text-muted-foreground">(comma separated)</span></Label>
        <Input value={fields.keywords} onChange={(event) => update("keywords", event.target.value)} placeholder="iris, dataset" />
      </div>
      <div className="flex flex-row items-center justify-between space-x-2">
        <div>
          <Label>Choose a language</Label>
          <Select value={fields.language} onValueChange={(value) => update("language", value)}>
            <SelectTrigger><SelectValue placeholder="Select a language" /></SelectTrigger>
            <SelectContent>
              <SelectGroup><SelectItem value="en-us">en-us</SelectItem></SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Choose a license</Label>
          <Select value={fields.license} onValueChange={(value) => update("license", value)}>
            <SelectTrigger><SelectValue placeholder="Select a license" /></SelectTrigger>
            <SelectContent>
              <SelectGroup><SelectItem value="CC BY 4.0">CC BY 4.0</SelectItem></SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>
    </>
  );
}
