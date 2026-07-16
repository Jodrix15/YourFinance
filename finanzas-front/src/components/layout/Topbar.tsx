import { useEffect, useRef, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import { LogoIcon } from '@/components/ui/LogoIcon'
import s from './Topbar.module.css'

const NAV = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/cuentas', label: 'Cuentas' },
  { to: '/recurrentes', label: 'Recurrentes' },
  { to: '/suscripciones', label: 'Suscripciones' },
  { to: '/deudas', label: 'Deudas' },
  { to: '/inversiones', label: 'Inversiones' },
]

export default function Topbar() {
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [menuOpen, setMenuOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const initials = (user?.username ?? 'JF').slice(0, 2).toUpperCase()

  return (
    <header className={s.topbar}>
      <div className={s.inner}>
        <div className={s.brand}>
          <div className={s.brandIcon}>
            <LogoIcon />
          </div>
          Jodrix<span>Finance</span>
        </div>

        <nav className={s.nav}>
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `${s.navBtn} ${isActive ? s.navActive : ''}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className={s.right}>
          <button
            className={s.iconBtn}
            onClick={toggleTheme}
            title="Cambiar tema"
            aria-label="Cambiar tema"
          >
            {theme === 'dark' ? (
              <svg viewBox="0 0 16 16">
                <path d="M8 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6m0 1a4 4 0 1 0 0-8 4 4 0 0 0 0 8M8 0a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 0m0 13a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 13m8-5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2a.5.5 0 0 1 .5.5M3 8a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2A.5.5 0 0 1 3 8m10.657-5.657a.5.5 0 0 1 0 .707l-1.414 1.415a.5.5 0 1 1-.707-.708l1.414-1.414a.5.5 0 0 1 .707 0m-9.193 9.193a.5.5 0 0 1 0 .707L3.05 13.657a.5.5 0 0 1-.707-.707l1.414-1.414a.5.5 0 0 1 .707 0m9.193 2.121a.5.5 0 0 1-.707 0l-1.414-1.414a.5.5 0 0 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .707M4.464 4.465a.5.5 0 0 1-.707 0L2.343 3.05a.5.5 0 1 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .707" />
              </svg>
            ) : (
              <svg viewBox="0 0 16 16">
                <path d="M6 .278a.77.77 0 0 1 .08.858 7.2 7.2 0 0 0-.878 3.46c0 4.021 3.278 7.277 7.318 7.277q.792-.001 1.533-.16a.79.79 0 0 1 .81.316.73.73 0 0 1-.031.893A8.35 8.35 0 0 1 8.344 16C3.734 16 0 12.286 0 7.71 0 4.266 2.114 1.312 5.124.06A.75.75 0 0 1 6 .278" />
              </svg>
            )}
          </button>

          <div className={s.avatarWrap} ref={wrapRef}>
            <button
              className={s.avatar}
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="Perfil"
            >
              {initials}
            </button>
            {menuOpen && (
              <div className={s.menu}>
                <div className={s.menuHead}>
                  <div className={s.menuName}>{user?.username}</div>
                  <div className={s.menuSub}>{user?.role}</div>
                </div>
                <button className={s.menuItem} onClick={toggleTheme}>
                  Cambiar tema ({theme === 'dark' ? 'claro' : 'oscuro'})
                </button>
                <button
                  className={`${s.menuItem} ${s.danger}`}
                  onClick={logout}
                >
                  Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
