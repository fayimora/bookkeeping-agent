import { Button } from '@bookeeping-agent/ui/components/button';
import { Link, useNavigate } from '@tanstack/react-router';

import { authClient } from '../lib/auth-client';

export default function Header() {
	const navigate = useNavigate();
	const session = authClient.useSession();
	const links = [
		{ label: 'Home', to: '/' },
		{ label: 'Expenses', to: '/expenses' },
		{ label: 'Categories', to: '/categories' },
		{ label: 'Chat', to: '/chat' },
	] as const;

	const handleLogout = async () => {
		await authClient.signOut();
		await navigate({ to: '/login' });
	};

	return (
		<div>
			<div className="flex flex-row items-center justify-between gap-4 px-4 py-3 md:px-8">
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
				<div className="flex items-center gap-3 text-sm">
					{session.data ? (
						<>
							<span className="text-muted-foreground">
								{session.data.user.name}
							</span>
							<Button
								onClick={handleLogout}
								size="xs"
								type="button"
								variant="outline"
							>
								Log out
							</Button>
						</>
					) : (
						<Link
							className="text-muted-foreground transition-colors hover:text-foreground"
							to="/login"
						>
							Sign in
						</Link>
					)}
				</div>
			</div>
			<hr />
		</div>
	);
}
