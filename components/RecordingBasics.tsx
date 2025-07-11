"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MAIN_LANGUAGES } from "@/lib/utils";

export const RecordingTypes: {
  name: string;
  value: string;
}[] = [
  {
    name: "Summary",
    value: "summary",
  },
  {
    name: "Quick Note",
    value: "quick-note",
  },
  {
    name: "List",
    value: "list",
  },
  {
    name: "Blog post",
    value: "blog",
  },
  {
    name: "Email",
    value: "email",
  },
  {
    name: "Custom Prompt",
    value: "custom-prompt",
  },
];

export const RecordingBasics = ({
  noteType,
  setNoteType,
  language,
  setLanguage,
}: {
  noteType: string;
  setNoteType: (noteType: string) => void;
  language?: string;
  setLanguage?: (language: string) => void;
}) => {
  return (
    <>
      <div className="w-full flex flex-col px-5 py-6 border-b border-gray-200">
        <div className="flex items-center mb-2">
          <span className="text-base font-medium text-left text-[#101828] mr-1">
            What are you creating?
          </span>
          <span className="text-base font-medium text-left text-[#6a7282]">
            [OPTIONAL]
          </span>
        </div>
        <div className="w-full">
          <Select value={noteType} onValueChange={setNoteType}>
            <SelectTrigger className="w-full h-9 bg-gray-100 border border-[#d1d5dc] rounded-lg">
              <SelectValue className="flex items-center" />
            </SelectTrigger>
            <SelectContent>
              {RecordingTypes.map((type) => (
                <SelectItem
                  key={type.value}
                  value={type.value}
                  className="flex items-center gap-2"
                >
                  <img
                    src={`/recordings/${type.value}.svg`}
                    className="size-[18px] min-w-[18px]"
                  />
                  <span>{type.name}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="w-full flex flex-col px-5 py-6 border-b border-gray-200">
        <div className="flex items-center mb-2">
          <span className="text-base font-medium text-left text-[#101828] mr-1">
            What language are you speaking?
          </span>
        </div>
        <div className="w-full">
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger className="w-full h-9 bg-gray-100 border border-[#d1d5dc] rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MAIN_LANGUAGES.map((lang) => (
                <SelectItem key={lang.value} value={lang.value}>
                  {lang.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </>
  );
};
