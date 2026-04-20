"use client";
/**
 * ============================================================================
 * COMPONENTE: Clientes.js (v1.0.0 - CRM BÁSICO)
 * PROPIETARIO: Jean - B J Importaciones Chiclayo
 * FUNCIONALIDAD: 
 * - Ranking automático de clientes por volumen de compra.
 * - Conteo de pedidos y última ubicación/teléfono registrado.
 * ============================================================================
 */
import React, { useMemo, useState } from 'react';
import { getFechaPeru } from '../lib/helpers';

export default function ClientesSection({ ventas, FUCSIA_PRINCIPAL, VERDE_BJ, OSCURO_BJ, styleCrd, styleInp }) {
    const [busquedaCRM, setBusquedaCRM] = useState('');

    // --- MOTOR DE ANÁLISIS DE CLIENTES ---
    const rankingClientes = useMemo(() => {
        const stats = {};
        
        // Filtramos ventas válidas (no anuladas) y excluimos "Tienda" si quieres ver solo clientes con nombre
        ventas.filter(v => v.estado_pedido !== 'Anulado' && v.cliente_nombre?.toLowerCase() !== 'tienda').forEach(v => {
            const nombre = v.cliente_nombre || "Cliente Anónimo";
            
            if (!stats[nombre]) {
                stats[nombre] = { 
                    nombre: nombre, 
                    total_invertido: 0, 
                    cantidad_pedidos: 0, 
                    localidad: v.localidad,
                    telefono: v.telefono,
                    ultima_compra: v.created_at
                };
            }
            
            stats[nombre].total_invertido += (Number(v.precio_venta_unitario) * Number(v.cantidad));
            stats[nombre].cantidad_pedidos += 1;
            
            // Actualizamos siempre a la información del pedido más reciente
            if (new Date(v.created_at) > new Date(stats[nombre].ultima_compra)) {
                stats[nombre].ultima_compra = v.created_at;
                stats[nombre].localidad = v.localidad; 
                stats[nombre].telefono = v.telefono;   
            }
        });

        // Convertimos a arreglo y ordenamos del que más compró al que menos
        let ranking = Object.values(stats).sort((a, b) => b.total_invertido - a.total_invertido);
        
        // Filtro de búsqueda
        if (busquedaCRM) {
            ranking = ranking.filter(c => c.nombre.toLowerCase().includes(busquedaCRM.toLowerCase()));
        }

        return ranking;
    }, [ventas, busquedaCRM]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '15px' }}>
                <div>
                    <h2 style={{ color: OSCURO_BJ, margin: '0 0 5px 0', fontSize: '1.4rem', fontWeight: '900' }}>👥 CRM - Base de Clientes</h2>
                    <small style={{ color: '#64748B', fontWeight: '900' }}>Inteligencia de fidelización y ranking VIP.</small>
                </div>
                <div style={{ flex: '1', minWidth: '250px', maxWidth: '400px' }}>
                    <input 
                        value={busquedaCRM} 
                        onChange={(e) => setBusquedaCRM(e.target.value)} 
                        placeholder="🔍 Buscar cliente VIP..." 
                        style={{ ...styleInp, padding: '12px', border: `2px solid ${OSCURO_BJ}` }} 
                    />
                </div>
            </div>

            <div style={styleCrd}>
                <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
                        <thead style={{ backgroundColor: '#F8FAFC', borderBottom: '2px solid #E2E8F0' }}>
                            <tr style={{ textAlign: 'left', fontSize: '12px', color: '#64748B' }}>
                                <th style={{ padding: '15px' }}>RANKING / CLIENTE</th>
                                <th style={{ padding: '15px' }}>CONTACTO / UBICACIÓN</th>
                                <th style={{ padding: '15px', textAlign: 'center' }}>PEDIDOS</th>
                                <th style={{ padding: '15px', textAlign: 'right' }}>VALOR TOTAL (LTV)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rankingClientes.length === 0 ? (
                                <tr><td colSpan="4" style={{ textAlign: 'center', padding: '30px', color: '#94A3B8' }}>No hay clientes registrados o coinciden con la búsqueda.</td></tr>
                            ) : (
                                rankingClientes.map((c, i) => (
                                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', transition: '0.2s' }}>
                                        <td style={{ padding: '15px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <div style={{ backgroundColor: i < 3 ? FUCSIA_PRINCIPAL : '#E2E8F0', color: i < 3 ? '#fff' : '#64748B', width: '25px', height: '25px', borderRadius: '5px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: '900', fontSize: '12px' }}>
                                                    {i + 1}
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <span style={{ fontWeight: '900', fontSize: '14px', color: OSCURO_BJ }}>
                                                        {i < 3 ? '👑 ' : ''}{c.nombre}
                                                    </span>
                                                    <small style={{ color: '#94A3B8', fontSize: '10px' }}>Última vez: {getFechaPeru(c.ultima_compra)}</small>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '15px', fontSize: '13px', color: '#64748B' }}>
                                            <strong style={{ color: OSCURO_BJ }}>{c.telefono || 'Sin WhatsApp'}</strong><br/>
                                            📍 {c.localidad || 'Sin Ubicación'}
                                        </td>
                                        <td style={{ padding: '15px', textAlign: 'center' }}>
                                            <span style={{ backgroundColor: '#F1F5F9', padding: '6px 12px', borderRadius: '10px', fontSize: '12px', fontWeight: '900', color: OSCURO_BJ }}>
                                                {c.cantidad_pedidos}
                                            </span>
                                        </td>
                                        <td style={{ padding: '15px', textAlign: 'right', fontWeight: '900', color: VERDE_BJ, fontSize: '16px' }}>
                                            S/ {c.total_invertido.toLocaleString('es-PE', {minimumFractionDigits: 2})}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}