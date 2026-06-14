import { Link } from '@tanstack/react-router';

export default function Header() {
	const links = [
		{ to: '/', label: 'Home' },
		{ to: '/expenses', label: 'Expenses' },
	] as const;

	return (
		<div>
			<div className="flex flex-row items-center justify-between px-4 py-3 md:px-8">
				<nav className="flex gap-4 text-sm">
					{links.map(({ to, label }) => (
						<Link
							activeProps={{ className: 'text-foreground' }}
							className="text-muted-foreground transition-colors hover:text-foreground"
							key={to}
							to={to}
						>
							{label}
						</Link>
					))}
				</nav>
				<div className="flex items-center gap-2" />
			</div>
			<hr />
		</div>
	);
}
