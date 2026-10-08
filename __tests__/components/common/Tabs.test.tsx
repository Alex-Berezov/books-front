import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Tabs } from '@/components/common/Tabs';
import type { TabItem } from '@/components/common/Tabs';

const items: TabItem[] = [
  { key: 'one', label: 'One', children: <p>Panel one</p> },
  { key: 'two', label: 'Two', children: <p>Panel two</p> },
  { key: 'three', label: 'Three', children: <p>Panel three</p> },
];

const expectSelected = (name: string) => {
  const tabs = screen.getAllByRole('tab');
  for (const tab of tabs) {
    const selected = tab.textContent === name;
    expect(tab).toHaveAttribute('aria-selected', String(selected));
    expect(tab).toHaveAttribute('tabindex', selected ? '0' : '-1');
  }
  const panel = screen.getByRole('tabpanel');
  const active = screen.getByRole('tab', { name });
  expect(active).toHaveAttribute('aria-controls', panel.id);
  expect(panel).toHaveAttribute('aria-labelledby', active.id);
  expect(panel).toHaveTextContent(`Panel ${name.toLowerCase()}`);
};

describe('Tabs', () => {
  it('рисует tablist с подписью и выбирает первую вкладку по умолчанию', () => {
    render(<Tabs items={items} ariaLabel="Shelf" />);

    expect(screen.getByRole('tablist', { name: 'Shelf' })).toBeInTheDocument();
    expectSelected('One');
  });

  it('учитывает defaultActiveKey', () => {
    render(<Tabs items={items} defaultActiveKey="two" />);
    expectSelected('Two');
  });

  it('каждая вкладка указывает на свою панель, неактивные панели пустые и скрыты', () => {
    const { container } = render(<Tabs items={items} />);

    const panels = container.querySelectorAll('[role="tabpanel"]');
    expect(panels).toHaveLength(3);
    screen.getAllByRole('tab', { hidden: true }).forEach((tab, index) => {
      expect(tab).toHaveAttribute('aria-controls', panels[index].id);
    });
    expect(panels[1]).toHaveAttribute('hidden');
    expect(panels[1]).toBeEmptyDOMElement();
    expect(panels[2]).toBeEmptyDOMElement();
  });

  it('клик переключает вкладку', async () => {
    const user = userEvent.setup();
    render(<Tabs items={items} />);

    await user.click(screen.getByRole('tab', { name: 'Three' }));

    expectSelected('Three');
    expect(screen.queryByText('Panel one')).not.toBeInTheDocument();
  });

  it('стрелки ходят по кругу, Home и End — к краям, фокус едет вместе с выбором', async () => {
    const user = userEvent.setup();
    render(<Tabs items={items} />);

    await user.click(screen.getByRole('tab', { name: 'One' }));

    await user.keyboard('{ArrowRight}');
    expectSelected('Two');
    expect(screen.getByRole('tab', { name: 'Two' })).toHaveFocus();

    await user.keyboard('{ArrowRight}{ArrowRight}');
    expectSelected('One');

    await user.keyboard('{ArrowLeft}');
    expectSelected('Three');
    expect(screen.getByRole('tab', { name: 'Three' })).toHaveFocus();

    await user.keyboard('{Home}');
    expectSelected('One');

    await user.keyboard('{End}');
    expectSelected('Three');
    expect(screen.getByRole('tab', { name: 'Three' })).toHaveFocus();
  });

  it('добавляет className к корню', () => {
    const { container } = render(<Tabs items={items} className="extra" />);
    expect(container.firstElementChild).toHaveClass('extra');
  });
});
