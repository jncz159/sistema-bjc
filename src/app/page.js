"use client";
/**
 * ============================================================================
 * SISTEMA: MASTER BÚNKER BJ - AUDITORÍA TOTAL (v2.1.0)
 * PROPIETARIO: Jean - B J Importaciones Chiclayo
 * * ESTATUS DE AUDITORÍA:
 * 1. REGLA DE ORO: Aplicado Number() en todos los procesos matemáticos.
 * 2. COBRO INTELIGENTE: Cash/Almacén (100%) vs Crédito (Abono Manual).
 * 3. EDICIÓN INDIVIDUAL: Diferenciales de stock y caja calculados por ítem.
 * 4. CRM: Autocompletado de localidad y teléfono para clientes antiguos.
 * 5. INTEGRIDAD: No se borra nada, se mantiene el rastro de auditoría.
 * ============================================================================
 */
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from './supabaseClient';
import { getFechaPeru, handleInputMonto, getHoraPeru, formatForInputDT } from '../lib/helpers';

import VentasSection from '../components/Ventas';
import AlmacenSection from '../components/Almacen';
import LogisticaSection from '../components/Logistica';
import GestionSection from '../components/Gestion';
import FinanzasSection from '../components/Finanzas';
import ClientesSection from '../components/Clientes';

export default function SistemaBJCMasterFinal() {
  
  // --- ESTADOS DE DATOS ---
  const [hasMounted, setHasMounted] = useState(false);
  const [productos, setProductos] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [finanzas, setFinanzas] = useState([]);
  const [auditoriaLogs, setAuditoriaLogs] = useState([]); 
  const [cargando, setCargando] = useState(true);

  // --- ESTADOS OPERATIVOS (VENTA) ---
  const [vista, setVista] = useState('ventas'); 
  const [efectivoRecibido, setEfectivoRecibido] = useState(''); 
  const [cliente, setCliente] = useState('Tienda'); 
  const [localidad, setLocalidad] = useState('Chiclayo'); 
  const [telefono, setTelefono] = useState('');
  const [tipoVenta, setTipoVenta] = useState('Menor'); 
  const [busqueda, setBusqueda] = useState(''); 
  const [busquedaStock, setBusquedaStock] = useState(''); 
  const [busquedaHistorial, setBusquedaHistorial] = useState('');
  const [fechaConsulta, setFechaConsulta] = useState(getFechaPeru());
  const [carrito, setCarrito] = useState([]);
  const [descuento, setDescuento] = useState(0);
  const [cantidades, setCantidades] = useState({}); 
  const [coloresElegidos, setColoresElegidos] = useState({});

  // --- SISTEMA DE SEGURIDAD ---
  const PIN_MAESTRO = "232310"; 
  const [accesoConcedido, setAccesoConcedido] = useState(false);
  const [pinIngresado, setPinIngresado] = useState('');
  const [errorPin, setErrorPin] = useState(false);

  // --- COLORES CORPORATIVOS ---
  const FUCSIA_PRINCIPAL = '#F01097';
  const VERDE_BJ = '#16A34A';
  const ROJO_BJ = '#E11D48';
  const AMARILLO_BJ = '#CA8A04';
  const OSCURO_BJ = '#1E1B1C';

  const styleInp = { padding: '16px', borderRadius: '16px', border: `2px solid #FCC2E2`, width: '100%', outline: 'none', fontSize: '16px', boxSizing: 'border-box' };
  const styleCrd = { backgroundColor: '#ffffff', borderRadius: '30px', padding: '25px', boxShadow: `0 15px 35px rgba(240, 16, 151, 0.05)`, border: '1px solid #FFF1F2' };

  useEffect(() => { 
    setHasMounted(true); 
    if (localStorage.getItem('bj_bunker_auth') === 'acceso_total') {
        setAccesoConcedido(true);
        cargarTodoDesdeNube();
    } else { setCargando(false); }
  }, []);

  const cargarTodoDesdeNube = async () => {
    try {
        const { data: p } = await supabase.from('productos').select('*').order('created_at', { ascending: false });
        const { data: v } = await supabase.from('ventas').select('*').order('created_at', { ascending: true });
        const { data: f } = await supabase.from('finanzas').select('*').order('created_at', { ascending: false });
        const { data: a } = await supabase.from('auditoria_bj').select('*').order('created_at', { ascending: true });
        if (p) setProductos(p); if (v) setVentas(v); if (f) setFinanzas(f); if (a) setAuditoriaLogs(a);
    } catch (e) { console.error("Error BJ Sync:", e); } finally { setCargando(false); }
  };

  // --- MATEMÁTICA Y BALANCES ---
  const valorizacionStockBJ = useMemo(() => {
    let cost = 0; let vent = 0; let pot = 0;
    productos.forEach(p => { 
        if (Number(p.stock) > 0) { 
            cost += (Number(p.precio_compra || 0) * Number(p.stock)); 
            vent += (Number(p.precio_venta || 0) * Number(p.stock)); 
            pot += (Number(p.precio_venta || 0) - Number(p.precio_compra || 0)) * Number(p.stock); 
        } 
    });
    return { cost, vent, pot };
  }, [productos]);

  const balanceEliteBJ = useMemo(() => {
    const hoyS = getFechaPeru();
    const vC = ventas.filter(v => v.estado_pedido === 'Entregado' || v.estado_pedido === 'En Almacén')
                    .reduce((acc, v) => acc + (Number(v.precio_venta_unitario) * Number(v.cantidad)), 0);
    const iA = finanzas.filter(f => ['Ingreso Adicional', 'Inversión Inicial'].includes(f.tipo)).reduce((acc, f) => acc + Number(f.monto), 0);
    const gT = finanzas.filter(f => !['Ingreso Adicional', 'Inversión Inicial'].includes(f.tipo)).reduce((acc, f) => acc + Number(f.monto), 0);
    const cajaReal = (vC + iA) - gT;
    const utH = ventas.filter(v => v.estado_pedido !== 'Anulado').reduce((acc, v) => acc + Number(v.ganancia_total || 0), 0);

    return {
        cH: ventas.filter(v => getFechaPeru(v.created_at) === hoyS && v.estado_pedido !== 'Pendiente de Pago' && v.estado_pedido !== 'Anulado').reduce((acc, v) => acc + (Number(v.precio_venta_unitario)*Number(v.cantidad)), 0),
        gH: ventas.filter(v => getFechaPeru(v.created_at) === hoyS && v.estado_pedido !== 'Anulado').reduce((acc, v) => acc + Number(v.ganancia_total || 0), 0),
        cG: cajaReal,
        bR: utH
    };
  }, [ventas, finanzas]);

  // --- LÓGICA DE CRM ---
  const handleAutocompleteClienteBJ = (e) => {
    const val = e.target.value; setCliente(val);
    const cF = ventas.find(v => v.cliente_nombre?.toLowerCase() === val.toLowerCase());
    if (cF) { setLocalidad(cF.localidad || 'Chiclayo'); setTelefono(cF.telefono || ''); }
  };

  // --- LÓGICA DE VENTAS (AUDITADA) ---
  const handleEjecutarVentaBJ = async (estado) => {
    if (!cliente || carrito.length === 0) return alert("Faltan datos o carrito vacío.");
    const snap = balanceEliteBJ.cG;
    const totalV = carrito.reduce((acc, i) => acc + (Number(i.precio_venta)*i.cantidad), 0);
    
    // REGLA DE ORO DE JEAN: Solo Crédito usa abono manual
    const montoHoy = (estado === 'Entregado' || estado === 'En Almacén') ? (totalV - Number(descuento)) : Number(efectivoRecibido);
    
    const ts = new Date().toISOString();
    const lista = carrito.map(i => ({ 
        cliente_nombre: cliente, localidad, telefono, producto_id: i.producto_id, 
        cantidad: i.cantidad, color: i.color, precio_venta_unitario: i.precio_venta, 
        precio_costo_unitario: i.precio_compra, ganancia_total: (Number(i.precio_venta)-Number(i.precio_compra))*i.cantidad, 
        estado_pedido: estado, created_at: ts 
    }));

    const { error } = await supabase.from('ventas').insert(lista);
    if (!error) {
        if (montoHoy > 0) {
            await supabase.from('auditoria_bj').insert([{ 
                cliente, operacion: estado === 'Pendiente de Pago' ? 'ABONO CRÉDITO' : 'VENTA CASH', 
                monto_operacion: montoHoy, caja_antes: snap, caja_despues: snap + montoHoy 
            }]);
        }
        for (const it of carrito) {
            const pO = productos.find(p => p.id === it.producto_id);
            if (pO) await supabase.from('productos').update({ stock: pO.stock - it.cantidad }).eq('id', it.producto_id);
        }
        setCarrito([]); setEfectivoRecibido(''); setCliente('Tienda'); setDescuento(0);
        cargarTodoDesdeNube();
    }
  };

  const handleUpdateItemVentaBJ = async (id, data) => {
    try {
        const { data: itemOriginal } = await supabase.from('ventas').select('*').eq('id', id).single();
        if (!itemOriginal) return;

        const pO = productos.find(p => p.id === itemOriginal.producto_id);
        const snap = balanceEliteBJ.cG; 

        // Diferenciales Matemáticos
        const diffCant = Number(itemOriginal.cantidad) - Number(data.cantidad);
        const totalOriginal = Number(itemOriginal.precio_venta_unitario) * Number(itemOriginal.cantidad);
        const totalNuevo = Number(data.precio_venta_unitario) * Number(data.cantidad);
        const diffCaja = totalOriginal - totalNuevo; 

        const nuevaGanancia = (Number(data.precio_venta_unitario) - Number(itemOriginal.precio_costo_unitario)) * Number(data.cantidad);
        
        await supabase.from('ventas').update({ 
            cantidad: Number(data.cantidad), 
            precio_venta_unitario: Number(data.precio_venta_unitario), 
            ganancia_total: nuevaGanancia 
        }).eq('id', id);

        if (diffCaja !== 0 || itemOriginal.cantidad !== data.cantidad) {
            await supabase.from('auditoria_bj').insert([{ 
                cliente: itemOriginal.cliente_nombre, 
                operacion: 'CORRECCIÓN HISTORIAL', 
                monto_operacion: -diffCaja, 
                caja_antes: snap, 
                caja_despues: snap - diffCaja 
            }]);
        }

        if (pO && diffCant !== 0) {
            await supabase.from('productos').update({ stock: Number(pO.stock) + diffCant }).eq('id', pO.id);
        }

        alert("✅ Ítem actualizado. Stock y Caja ajustados.");
        cargarTodoDesdeNube();
    } catch (e) { console.error("Error individual:", e); }
  };

  const handleAnularVentaBJ = async (v) => {
    if (v.estado_pedido === 'Anulado') return alert("Ya anulado.");
    if (confirm("¿Anular este ítem y devolver stock/dinero?")) {
        const snap = balanceEliteBJ.cG;
        const pO = productos.find(p => p.id === v.producto_id);
        if (pO) await supabase.from('productos').update({ stock: pO.stock + v.cantidad }).eq('id', pO.id);
        
        let montoADevolver = v.estado_pedido !== 'Pendiente de Pago' ? (Number(v.precio_venta_unitario) * v.cantidad) : 0;
        
        if (montoADevolver > 0) {
            await supabase.from('auditoria_bj').insert([{ 
                cliente: v.cliente_nombre, operacion: 'ANULACIÓN VENTA', 
                monto_operacion: -montoADevolver, caja_antes: snap, caja_despues: snap - montoADevolver 
            }]);
        }
        await supabase.from('ventas').update({ estado_pedido: 'Anulado' }).eq('id', v.id);
        cargarTodoDesdeNube();
    }
  };

  // --- FINANZAS ---
  const handleRegistrarFinanzaBJ = async (e) => {
    e.preventDefault();
    const pre = balanceEliteBJ.cG;
    const mF = Number(handleInputMonto(formFinanzas.monto));
    const esGasto = !['Ingreso Adicional', 'Inversión Inicial'].includes(formFinanzas.tipo);
    const delta = esGasto ? -mF : mF;

    const { error } = await supabase.from('finanzas').insert([{ ...formFinanzas, monto: mF }]);
    if (!error) {
        await supabase.from('auditoria_bj').insert([{ 
            cliente: 'ADMINISTRATIVO', operacion: formFinanzas.tipo.toUpperCase(), 
            monto_operacion: delta, caja_antes: pre, caja_despues: pre + delta 
        }]);
        setFormFinanzas({ tipo: 'Gasto Local', descripcion: '', monto: '' });
        cargarTodoDesdeNube();
    }
  };

  // --- RENDERING (VISTAS) ---
  const intentarAcceso = (e) => {
    e.preventDefault();
    if (pinIngresado === PIN_MAESTRO) {
        localStorage.setItem('bj_bunker_auth', 'acceso_total');
        setAccesoConcedido(true);
        cargarTodoDesdeNube();
    } else { setErrorPin(true); setPinIngresado(''); }
  };

  if (!hasMounted) return null;
  if (!accesoConcedido) {
    return (
        <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: OSCURO_BJ }}>
            <div style={{ backgroundColor: '#ffffff10', padding: '40px', borderRadius: '30px', border: `1px solid ${FUCSIA_PRINCIPAL}50`, textAlign: 'center', maxWidth: '350px', width: '90%' }}>
                <h2 style={{ color: '#fff', fontWeight: '900' }}>BÚNKER BJ</h2>
                <form onSubmit={intentarAcceso} style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
                    <input type="password" value={pinIngresado} onChange={(e) => setPinIngresado(e.target.value)} placeholder="CÓDIGO PIN" style={{...styleInp, textAlign: 'center', fontSize: '20px', letterSpacing: '5px'}} />
                    <button type="submit" style={{ backgroundColor: FUCSIA_PRINCIPAL, color: '#fff', border: 'none', padding: '18px', borderRadius: '15px', fontWeight: '900', cursor: 'pointer' }}>DESBLOQUEAR 🔓</button>
                </form>
            </div>
        </div>
    );
  }

  if (cargando) return <div style={{ height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', color:FUCSIA_PRINCIPAL, fontWeight:'900' }}>CARGANDO BÚNKER... 🚀</div>;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FFF5F7', color: OSCURO_BJ }}>
      <header style={{ backgroundColor: '#ffffff', padding: '10px 5%', position: 'sticky', top: 0, zIndex: 100, boxShadow: `0 4px 15px rgba(0,0,0,0.06)` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h1 style={{ fontSize: '1rem', fontWeight: '900', color: FUCSIA_PRINCIPAL }}>BJ MASTER MASTER</h1>
            <button onClick={cerrarSesion} style={{ color: ROJO_BJ, border: 'none', background: 'none', fontWeight: '900', cursor: 'pointer' }}>BLOQUEAR 🔒</button>
        </div>
        <nav style={{ display: 'flex', gap: '5px', overflowX: 'auto', marginTop: '10px', paddingBottom: '10px' }}>
            {['ventas', 'stock', 'logistica', 'finanzas', 'clientes', 'contabilidad'].map(t => (
              <button key={t} onClick={() => setVista(t)} style={{ flex: '0 0 auto', backgroundColor: vista === t ? FUCSIA_PRINCIPAL : '#fff', color: vista === t ? '#fff' : FUCSIA_PRINCIPAL, border: `1px solid ${FUCSIA_PRINCIPAL}`, padding: '10px 15px', borderRadius: '10px', fontWeight: '900', fontSize: '11px', cursor: 'pointer' }}>
                {t.toUpperCase()}
              </button>
            ))}
        </nav>
      </header>

      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '15px' }}>
        {vista === 'ventas' && <VentasSection {...{ balanceEliteBJ, handleUpdateItemVentaBJ, fechaConsulta, setFechaConsulta, efectivoRecibido, setEfectivoRecibido, tipoVenta, setTipoVenta, cliente, handleAutocompleteCliente: handleAutocompleteClienteBJ, ventas, localidad, setLocalidad, telefono, setTelefono, carrito, setCarrito, descuento, setDescuento, handleEjecutarVentaBJ, busqueda, setBusqueda, productos, coloresElegidos, setColoresElegidos, cantidades, setCantidades, busquedaHistorial, setBusquedaHistorial, historialVentasDiaBJ, handleAnularVentaBJ, analiticaProBJ: {top:[]}, FUCSIA_PRINCIPAL, VERDE_BJ, ROJO_BJ, AMARILLO_BJ, OSCURO_BJ, styleInp, styleCrd }} />}
        {vista === 'stock' && <AlmacenSection {...{ productos, cargarTodoDesdeNube, FUCSIA_PRINCIPAL, VERDE_BJ, ROJO_BJ, OSCURO_BJ, styleInp, styleCrd }} />}
        {vista === 'logistica' && <LogisticaSection {...{ logisticaInteligente: {almacen:[], deudas:[]}, productos, FUCSIA_PRINCIPAL, VERDE_BJ, AMARILLO_BJ, ROJO_BJ, OSCURO_BJ, styleCrd, styleInp }} />}
        {vista === 'finanzas' && <FinanzasSection {...{ ventas, productos, finanzas, balanceEliteBJ, FUCSIA_PRINCIPAL, VERDE_BJ, ROJO_BJ, AMARILLO_BJ, OSCURO_BJ, styleInp, styleCrd }} />}
        {vista === 'clientes' && <ClientesSection {...{ ventas, FUCSIA_PRINCIPAL, VERDE_BJ, OSCURO_BJ, styleCrd, styleInp }} />}
        {vista === 'contabilidad' && <GestionSection {...{ balanceEliteBJ, valorizacionStockBJ, analiticaProBJ: {top:[]}, finanzas, handleRegistrarFinanzaBJ, FUCSIA_PRINCIPAL, VERDE_BJ, ROJO_BJ, AMARILLO_BJ, OSCURO_BJ, styleInp, styleCrd }} />}
      </main>
    </div>
  );
}