'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { AuthService } from '@/lib/services/auth-service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, Plus, UserPlus } from 'lucide-react'
import type { Usuario } from '@/lib/types'

export default function EmployeesPage() {
    const [employees, setEmployees] = useState<Usuario[]>([])
    const [loading, setLoading] = useState(true)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [formData, setFormData] = useState({
        nombre: '',
        email: '',
        password: '',
        telefono: '',
    })
    const [submitting, setSubmitting] = useState(false)
    const { toast } = useToast()

    const fetchEmployees = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            // Get current user's store
            const { data: currentUser } = await supabase
                .from('usuarios')
                .select('tienda_id')
                .eq('auth_uid', user.id)
                .single()

            if (!currentUser?.tienda_id) return

            // Fetch employees of this store
            const { data, error } = await supabase
                .from('usuarios')
                .select('*')
                .eq('tienda_id', currentUser.tienda_id)
                .eq('rol', 'empleado')
                .order('nombre', { ascending: true })

            if (error) throw error

            // Map to Usuario type (simplified mapping)
            const mapped: Usuario[] = (data || []).map((row: any) => ({
                id: row.id,
                authUid: row.auth_uid,
                tiendaId: row.tienda_id,
                nombre: row.nombre,
                email: row.email,
                telefono: row.telefono,
                rol: row.rol,
                estado: row.estado,
                createdAt: row.created_at,
            }))

            setEmployees(mapped)
        } catch (error) {
            console.error('Error fetching employees:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchEmployees()
    }, [])

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault()
        setSubmitting(true)

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('No session')

            const { data: currentUser } = await supabase
                .from('usuarios')
                .select('tienda_id')
                .eq('auth_uid', user.id)
                .single()

            if (!currentUser?.tienda_id) throw new Error('No store context')

            const result = await AuthService.register({
                nombre: formData.nombre,
                email: formData.email,
                password: formData.password,
                rol: 'empleado',
                telefono: formData.telefono,
                tiendaId: currentUser.tienda_id,
            })

            if (!result.success) {
                throw new Error(result.message)
            }

            toast({
                title: 'Empleado registrado',
                description: 'El empleado ha sido creado exitosamente.',
            })

            setIsDialogOpen(false)
            setFormData({ nombre: '', email: '', password: '', telefono: '' })
            fetchEmployees()

        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error.message || 'No se pudo registrar al empleado.',
            })
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Empleados</h1>
                    <p className="text-muted-foreground">
                        Gestiona el personal de tu tienda.
                    </p>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Nuevo Empleado
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Registrar Nuevo Empleado</DialogTitle>
                            <DialogDescription>
                                Crea una cuenta para un nuevo miembro del equipo.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleRegister} className="space-y-4 mt-4">
                            <div className="space-y-2">
                                <Label htmlFor="nombre">Nombre Completo</Label>
                                <Input
                                    id="nombre"
                                    value={formData.nombre}
                                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Correo Electrónico</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="telefono">Teléfono (Opcional)</Label>
                                <Input
                                    id="telefono"
                                    value={formData.telefono}
                                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password">Contraseña Temporal</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    required
                                    minLength={6}
                                />
                            </div>
                            <Button type="submit" className="w-full" disabled={submitting}>
                                {submitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Registrando...
                                    </>
                                ) : (
                                    'Registrar Empleado'
                                )}
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="border rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nombre</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Teléfono</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead>Fecha Registro</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                                </TableCell>
                            </TableRow>
                        ) : employees.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                    No hay empleados registrados.
                                </TableCell>
                            </TableRow>
                        ) : (
                            employees.map((employee) => (
                                <TableRow key={employee.id}>
                                    <TableCell className="font-medium">{employee.nombre}</TableCell>
                                    <TableCell>{employee.email}</TableCell>
                                    <TableCell>{employee.telefono || '-'}</TableCell>
                                    <TableCell>
                                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${employee.estado === 'activo' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                            }`}>
                                            {employee.estado}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        {new Date(employee.createdAt).toLocaleDateString()}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
