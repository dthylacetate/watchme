interface DatePickerProps {
  selectedDate: string;
  onChange: (date: string) => void;
}

export default function DatePicker({ selectedDate, onChange }: DatePickerProps) {
  return (
    <label>
      <input
        className="date-input"
        type="date"
        value={selectedDate}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
