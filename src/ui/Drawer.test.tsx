import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { Drawer } from './Drawer';

function Harness({ returnFocus }: { returnFocus?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Open details</button>
      {open && (
        <Drawer title="TCK-000042" onClose={() => setOpen(false)} returnFocus={returnFocus}>
          <p>Body</p>
        </Drawer>
      )}
    </>
  );
}

describe('Drawer', () => {
  it('is a dialog labelled by its title', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'Open details' }));
    expect(screen.getByRole('dialog', { name: 'TCK-000042' })).toBeInTheDocument();
  });

  it('closes via the close button and returns focus to the opener', async () => {
    render(<Harness />);
    const opener = screen.getByRole('button', { name: 'Open details' });
    await userEvent.click(opener);
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it('lets the owner handle Esc (cancel) instead of the browser closing it behind React', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'Open details' }));
    const cancel = new Event('cancel', { cancelable: true });
    fireEvent(screen.getByRole('dialog'), cancel);
    expect(cancel.defaultPrevented).toBe(true);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('uses a custom returnFocus when given (e.g. a recycled virtual row)', async () => {
    const returnFocus = vi.fn();
    render(<Harness returnFocus={returnFocus} />);
    await userEvent.click(screen.getByRole('button', { name: 'Open details' }));
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(returnFocus).toHaveBeenCalledOnce();
  });
});
