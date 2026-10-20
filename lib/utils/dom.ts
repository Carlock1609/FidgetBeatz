/** True while any modal dialog is open — global shortcuts stand down so typing and Esc work. */
export function isDialogOpen(): boolean {
  return document.querySelector('[role="dialog"], [role="alertdialog"]') !== null;
}
