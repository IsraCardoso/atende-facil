/** Menu mobile em Sheet — padrão backoffice-app. */
import { Menu } from "lucide-react";
import { useState } from "react";
import { Button } from "ui/button";
import { Separator } from "ui/separator";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "ui/sheet";

import { SidebarNav } from "./sidebar-nav";
import { SidebarOperationalStatus } from "./sidebar-operational-status";
import { UserMenu } from "./user-menu";

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild={true}>
        <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Abrir menu">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="flex w-72 flex-col p-0">
        <SheetTitle className="px-4 pt-4 text-lg font-semibold">Atende Fácil</SheetTitle>
        <nav className="flex-1 space-y-1 overflow-y-auto p-2">
          <SidebarNav onNavigate={() => setOpen(false)} />
        </nav>
        <div className="p-2">
          <Separator className="my-2" />
          <SidebarOperationalStatus />
          <UserMenu />
        </div>
      </SheetContent>
    </Sheet>
  );
}
