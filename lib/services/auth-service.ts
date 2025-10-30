import { usuarios, type Usuario } from "@/lib/data/mock-data"

export interface AuthResponse {
  success: boolean
  user?: Usuario
  message?: string
}

export class AuthService {
  static login(email: string, password: string): AuthResponse {
    const user = usuarios.find((u) => u.email === email && u.password === password)

    if (!user) {
      return {
        success: false,
        message: "Credenciales incorrectas",
      }
    }

    if (user.estado === "inactivo") {
      return {
        success: false,
        message: "Usuario inactivo",
      }
    }

    // Guardar en localStorage
    if (typeof window !== "undefined") {
      localStorage.setItem("user", JSON.stringify(user))
    }

    return {
      success: true,
      user,
    }
  }

  static logout(): void {
    if (typeof window !== "undefined") {
      localStorage.removeItem("user")
    }
  }

  static getCurrentUser(): Usuario | null {
    if (typeof window !== "undefined") {
      const userStr = localStorage.getItem("user")
      if (userStr) {
        return JSON.parse(userStr)
      }
    }
    return null
  }

  static isAuthenticated(): boolean {
    return this.getCurrentUser() !== null
  }

  static isAdmin(): boolean {
    const user = this.getCurrentUser()
    return user?.rol === "admin"
  }

  static isEmpleado(): boolean {
    const user = this.getCurrentUser()
    return user?.rol === "empleado"
  }
}
