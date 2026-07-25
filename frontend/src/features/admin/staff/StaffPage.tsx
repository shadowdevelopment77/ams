import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { ApiError } from '@/api/client'
import { getCompanies } from '@/api/company'
import { getDivisionsByCompany } from '@/api/division'
import {
  getUsers,
  getUsersByCompanyDivision,
  registerUser,
  updateUser,
  deleteUser,
  type User,
  type RegisterUserInput,
} from '@/api/user'
import { RegisterUserDialog } from './RegisterUserDialog'
import { EditUserDialog } from './EditUserDialog'

const USERS_KEY = ['admin', 'users'] as const

export function StaffPage() {
  const queryClient = useQueryClient()

  // ── All users ──
  const [page, setPage] = useState(1)
  const { data, isLoading } = useQuery({
    queryKey: [...USERS_KEY, page],
    queryFn: () => getUsers({ page, limit: 10 }),
  })

  const [registerOpen, setRegisterOpen] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const invalidateUsers = () => queryClient.invalidateQueries({ queryKey: USERS_KEY })

  const handleRegister = async (input: RegisterUserInput) => {
    await registerUser(input)
    await invalidateUsers()
  }

  const handleEditSubmit = async (input: { name?: string; email?: string; phone?: string }) => {
    if (!editing) return
    await updateUser(editing.id, input)
    await invalidateUsers()
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleteError(null)
    setIsDeleting(true)
    try {
      await deleteUser(deleteTarget.id)
      await invalidateUsers()
      setDeleteTarget(null)
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : 'Something went wrong')
    } finally {
      setIsDeleting(false)
    }
  }

  // ── Roster by company & division (the only place role is visible --
  // the flat /api/users list doesn't join role/company/division). ──
  const [rosterCompanyId, setRosterCompanyId] = useState<string>('')
  const [rosterDivisionId, setRosterDivisionId] = useState<string>('')

  const { data: rosterCompanies } = useQuery({
    queryKey: ['admin', 'companies', 'all'],
    queryFn: () => getCompanies({ limit: 100 }),
  })

  const { data: rosterDivisions } = useQuery({
    queryKey: ['admin', 'companies', rosterCompanyId, 'divisions', 'all'],
    queryFn: () => getDivisionsByCompany(Number(rosterCompanyId), { limit: 100 }),
    enabled: !!rosterCompanyId,
  })

  const { data: roster, isLoading: rosterLoading } = useQuery({
    queryKey: ['admin', 'roster', rosterCompanyId, rosterDivisionId],
    queryFn: () => getUsersByCompanyDivision(Number(rosterCompanyId), Number(rosterDivisionId), { limit: 100 }),
    enabled: !!rosterCompanyId && !!rosterDivisionId,
  })

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Staff</h1>
        <Button onClick={() => setRegisterOpen(true)}>Register Staff / Supervisor</Button>
      </div>

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={5}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                </TableRow>
              ))}

            {!isLoading && data?.data.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No users yet.
                </TableCell>
              </TableRow>
            )}

            {data?.data.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.phone ?? '—'}</TableCell>
                <TableCell>
                  <Badge variant={user.is_active ? 'default' : 'secondary'}>
                    {user.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => setEditing(user)}>
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => {
                      setDeleteError(null)
                      setDeleteTarget(user)
                    }}
                  >
                    Deactivate
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {data.page} of {data.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= data.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}

      <div className="mt-6 flex flex-col gap-3">
        <div>
          <h2 className="text-lg font-medium">Roster by company &amp; division</h2>
          <p className="text-sm text-muted-foreground">
            Shows each staff member's role — only STAFF are ever assigned to a division, so
            supervisors and admins won't appear here.
          </p>
        </div>

        <div className="flex gap-3">
          <Select
            value={rosterCompanyId}
            onValueChange={(v) => {
              setRosterCompanyId(v ?? '')
              setRosterDivisionId('')
            }}
          >
            <SelectTrigger className="w-56">
              <SelectValue>
                {(value: string | null) =>
                  value ? rosterCompanies?.data.find((c) => String(c.id) === value)?.name : 'Select a company'
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {rosterCompanies?.data.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={rosterDivisionId}
            onValueChange={(v) => setRosterDivisionId(v ?? '')}
            disabled={!rosterCompanyId}
          >
            <SelectTrigger className="w-56">
              <SelectValue>
                {(value: string | null) =>
                  value ? rosterDivisions?.data.find((d) => String(d.id) === value)?.name : 'Select a division'
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {rosterDivisions?.data.map((d) => (
                <SelectItem key={d.id} value={String(d.id)}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {rosterCompanyId && rosterDivisionId && (
          <div className="rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rosterLoading && (
                  <TableRow>
                    <TableCell colSpan={4}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  </TableRow>
                )}
                {!rosterLoading && roster?.data.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No one assigned to this division yet.
                    </TableCell>
                  </TableRow>
                )}
                {roster?.data.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium">{entry.user.name}</TableCell>
                    <TableCell>{entry.user.email}</TableCell>
                    <TableCell>{entry.userRole.name}</TableCell>
                    <TableCell>
                      <Badge variant={entry.user.is_active ? 'default' : 'secondary'}>
                        {entry.user.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <RegisterUserDialog open={registerOpen} onOpenChange={setRegisterOpen} onSubmit={handleRegister} />

      <EditUserDialog
        open={!!editing}
        onOpenChange={(open) => !open && setEditing(null)}
        user={editing}
        onSubmit={handleEditSubmit}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Deactivate ${deleteTarget?.name}?`}
        description="This soft-deletes the user and ends all their active sessions."
        confirmLabel="Deactivate"
        onConfirm={handleDelete}
        isConfirming={isDeleting}
        error={deleteError}
      />
    </div>
  )
}
