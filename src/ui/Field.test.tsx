import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { CheckboxGroup, TextField } from './Field';

const OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'pending', label: 'Pending' },
  { value: 'solved', label: 'Solved' },
] as const;

function Group({ onChange }: { onChange: (v: string[]) => void }) {
  const [value, setValue] = useState<string[]>([]);
  return (
    <CheckboxGroup
      legend="Status"
      options={OPTIONS}
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange(next);
      }}
    />
  );
}

test('CheckboxGroup is a labelled group whose value keeps option order', async () => {
  const onChange = vi.fn();
  render(<Group onChange={onChange} />);
  expect(screen.getByRole('group', { name: 'Status' })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('checkbox', { name: 'Solved' }));
  await userEvent.click(screen.getByRole('checkbox', { name: 'Open' }));
  expect(onChange).toHaveBeenLastCalledWith(['open', 'solved']);
  await userEvent.click(screen.getByRole('checkbox', { name: 'Solved' }));
  expect(onChange).toHaveBeenLastCalledWith(['open']);
});

test('TextField associates its label, hint and error', () => {
  render(<TextField label="Search" hint="Subject, customer or id" error="Too long" />);
  const input = screen.getByRole('textbox', { name: 'Search' });
  expect(input).toHaveAccessibleDescription('Subject, customer or id Too long');
  expect(input).toBeInvalid();
});
