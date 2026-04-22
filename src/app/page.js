"use client";
/**
 * ============================================================================
 * SISTEMA: MASTER BÚNKER BJ - AUDITORÍA TOTAL FINAL (v4.0.0)
 * PROPIETARIO: Jean - B J Importaciones Chiclayo
 * * REGLAS DE ORO APLICADAS:
 * 1. NO SIMPLIFICACIÓN: Se mantienen todas las líneas de lógica operativa.
 * 2. CERO REFERENCIAS NULAS: Todas las funciones (cerrarSesion, CRM, etc.) definidas.
 * 3. MATEMÁTICA NUMBER(): Blindaje contra errores de concatenación.
 * 4. CAJA UNIFICADA: Todo gasto y venta impacta el balance real.
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

  // --- ESTADOS OPERATIVOS ---
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

  // --- ESTADOS DE FORMULARIOS (RESTABLECIDOS PARA EVITAR ERRORES) ---
  const [formProd, setFormProd] = useState({ nombre: '', precio_compra: '', precio_venta: '', precio_menor: '', stock: '', colores: '' });
  const [formFinanzas, setFormFinanzas] = useState({ tipo: 'Gasto Local', descripcion: '', monto: '' });
  const [idEditProducto, setIdEditProducto] = useState(null);
  const [formEditProducto, setFormEditProducto] = useState({});
  const [formEditStockBJ, setFormEditStockBJ] = useState({});

  // --- SISTEMA DE SEGURIDAD ---
  const PIN_MAESTRO = "232310"; 
  const [accesoConcedido, setAccesoConcedido] = useState(false);
  const [pinIngresado, setPinIngresado] = useState('');
  const [errorPin, setErrorPin] = useState(false);

  // --- DISEÑO CORPORATIVO BJ ---
  const FUCSIA_PRINCIPAL = '#F01097';
  const VERDE_BJ = '#16A34A';
  const ROJO_BJ = '#E11D48';
  const AMARILLO_BJ = '#CA8A04';
  const OSCURO_BJ = '#1E1B1C';

  const styleInp = { padding: '16px', borderRadius: '16px', border: `2px solid #FCC2E2`, width: '100%', outline: 'none', fontSize: '16px', boxSizing: 'border-box', backgroundColor: '#fff' };
  const styleCrd = { backgroundColor: '#ffffff', borderRadius: '30px', padding: '25px', boxShadow: `0 15px 35px rgba(240, 16, 151, 0.05)`, border: '1px solid #FFF1F2', boxSizing: 'border-box' };

  useEffect(() => { 
    setHasMounted(true); 
    const sesion = localStorage.getItem('bj_bunker_auth');
    if (sesion === 'acceso_total') {
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

  const cerrarSesion = () => {
    if(confirm("¿Bloquear el Búnker?")) {
        localStorage.removeItem('bj_bunker_auth');
        setAccesoConcedido(false);
        setPinIngresado('');
    }
  };

  // --- MATEMÁTICA DE VALORIZACIÓN ---
  const valorizacionStockBJ = useMemo(() => {
    let cost = 0; let vent = 0; let pot = 0;
    productos.forEach(p => { 
        const s = Number(p.stock || 0);
        if (s > 0) { 
            cost += (Number(p.precio_compra || 0) * s); 
            vent += (Number(p.precio_venta || 0) * s); 
            pot += (Number(p.precio_venta || 0) - Number(p.precio_compra || 0)) * s; 
        } 
    });
    return { cost, vent, pot };
  }, [productos]);

  const balanceEliteBJ = useMemo(() => {
    const hoyS = getFechaPeru();
    const vC = ventas.filter(v => v.estado_pedido === 'Entregado' || v.estado_pedido === 'En Almacén').reduce((acc, v) => acc + (Number(v.precio_venta_unitario) * Number(v.cantidad)), 0);
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

  const analiticaProBJ = useMemo(() => {
    const counts = {}; 
    ventas.forEach(v => { 
        if(v.estado_pedido !== 'Anulado') { 
            const name = productos?.find(p => p.id === v.producto_id)?.nombre || "Modelo Eliminado"; 
            counts[name] = (counts[name] || 0) + Number(v.cantidad); 
        } 
    });
    return { top: Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,5) };
  }, [ventas, productos]);

  const logisticaInteligente = useMemo(() => {
    const mA = {}; const mD = {};
    ventas.forEach(v => {
        const key = `${v.cliente_nombre}-${v.localidad}`;
        const pM = productos?.find(p => p.id === v.producto_id);
        const it = { id: v.id, producto_id: v.producto_id, nombre: pM?.nombre, cantidad: v.cantidad, color: v.color, subtotal: (v.precio_venta_unitario * v.cantidad), precio: v.precio_venta_unitario };
        if (v.estado_pedido === 'En Almacén') { if(!mA[key]) mA[key]={cliente:v.cliente_nombre, localidad:v.localidad, items:[], items_ids:[], total:0}; mA[key].items.push(it); mA[key].items_ids.push(v.id); mA[key].total += it.subtotal; }
        if (v.estado_pedido === 'Pendiente de Pago') { if(!mD[key]) mD[key]={cliente:v.cliente_nombre, localidad:v.localidad, items:[], items_ids:[], total:0}; mD[key].items.push(it); mD[key].items_ids.push(v.id); mD[key].total += it.subtotal; }
    });
    return { almacen: Object.values(mA), deudas: Object.values(mD) };
  }, [ventas, productos]);

  const historialVentasDiaBJ = useMemo(() => {
    const filt = ventas.filter(v => getFechaPeru(v.created_at) === fechaConsulta && v.cliente_nombre?.toLowerCase().includes(busquedaHistorial.toLowerCase()));
    const groups = {};
    filt.forEach(v => {
        const hId = `${v.cliente_nombre}-${v.created_at?.substring(0,16)}`; 
        if (!groups[hId]) groups[hId] = { id_grupo: hId, cliente_nombre: v.cliente_nombre, localidad: v.localidad, telefono: v.telefono, hora: getHoraPeru(v.created_at), total: 0, items: [] };
        groups[hId].items.push(v); groups[hId].total += (Number(v.precio_venta_unitario) * v.cantidad);
    });
    return Object.values(groups).reverse();
  }, [ventas, fechaConsulta, busquedaHistorial]);

  // --- CRM Y AUTOCOMPLETADO ---
  const handleAutocompleteClienteBJ = (e) => {
    const val = e.target.value; setCliente(val);
    const cF = ventas.find(v => v.cliente_nombre?.toLowerCase() === val.toLowerCase());
    if (cF) { setLocalidad(cF.localidad || 'Chiclayo'); setTelefono(cF.telefono || ''); }
  };

  // --- OPERACIONES DE VENTA ---
  const handleEjecutarVentaBJ = async (estado) => {
    if (!cliente || carrito.length === 0) return alert("Faltan datos.");
    const snap = balanceEliteBJ.cG;
    const totalV = carrito.reduce((acc, i) => acc + (Number(i.precio_venta)*i.cantidad), 0);
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
            await supabase.from('auditoria_bj').insert([{ cliente, operacion: 'COBRO VENTA', monto_operacion: montoHoy, caja_antes: snap, caja_despues: snap + montoHoy }]);
        }
        for (const it of carrito) {
            const pO = productos.find(p => p.id === it.producto_id);
            if (pO) await supabase.from('productos').update({ stock: pO.stock - it.cantidad }).eq('id', it.producto_id);
        }
        setCarrito([]); setEfectivoRecibido(''); setCliente('Tienda'); setLocalidad('Chiclayo'); setTelefono(''); cargarTodoDesdeNube();
    }
  };

  const handleUpdateItemVentaBJ = async (id, data) => {
    try {
        const { data: itemOrig } = await supabase.from('ventas').select('*').eq('id', id).single();
        const diffCant = Number(itemOrig.cantidad) - Number(data.cantidad);
        const diffCaja = (Number(itemOrig.precio_venta_unitario) * Number(itemOrig.cantidad)) - (Number(data.precio_venta_unitario) * Number(data.cantidad));
        
        await supabase.from('ventas').update({ 
            cantidad: Number(data.cantidad), 
            precio_venta_unitario: Number(data.precio_venta_unitario), 
            ganancia_total: (Number(data.precio_venta_unitario) - Number(itemOrig.precio_costo_unitario)) * Number(data.cantidad) 
        }).eq('id', id);

        if (itemOrig.estado_pedido !== 'Pendiente de Pago' && diffCaja !== 0) {
            await supabase.from('auditoria_bj').insert([{ cliente: itemOrig.cliente_nombre, operacion: 'CORRECCIÓN', monto_operacion: -diffCaja, caja_antes: balanceEliteBJ.cG, caja_despues: balanceEliteBJ.cG - diffCaja }]);
        }
        const pO = productos.find(p => p.id === itemOrig.producto_id);
        if (pO && diffCant !== 0) await supabase.from('productos').update({ stock: pO.stock + diffCant }).eq('id', pO.id);
        cargarTodoDesdeNube();
    } catch (e) { console.error(e); }
  };

  const handleAnularVentaBJ = async (v) => {
    if (confirm("¿Anular ítem?")) {
        const pO = productos.find(p => p.id === v.producto_id);
        if (pO) await supabase.from('productos').update({ stock: pO.stock + v.cantidad }).eq('id', pO.id);
        if (v.estado_pedido !== 'Pendiente de Pago') {
            const m = Number(v.precio_venta_unitario) * Number(v.cantidad);
            await supabase.from('auditoria_bj').insert([{ cliente: v.cliente_nombre, operacion: 'ANULACIÓN', monto_operacion: -m, caja_antes: balanceEliteBJ.cG, caja_despues: balanceEliteBJ.cG - m }]);
        }
        await supabase.from('ventas').update({ estado_pedido: 'Anulado' }).eq('id', v.id);
        cargarTodoDesdeNube();
    }
  };

  // --- FINANZAS ---
  const handleRegistrarFinanzaBJ = async (e) => {
    e.preventDefault();
    const mF = Number(handleInputMonto(formFinanzas.monto));
    const esGasto = !['Ingreso Adicional', 'Inversión Inicial'].includes(formFinanzas.tipo);
    const { error } = await supabase.from('finanzas').insert([{ ...formFinanzas, monto: mF }]);
    if (!error) {
        await supabase.from('auditoria_bj').insert([{ cliente: 'ADMIN', operacion: formFinanzas.tipo.toUpperCase(), monto_operacion: esGasto ? -mF : mF, caja_antes: balanceEliteBJ.cG, caja_despues: esGasto ? balanceEliteBJ.cG - mF : balanceEliteBJ.cG + mF }]);
        setFormFinanzas({ tipo: 'Gasto Local', descripcion: '', monto: '' });
        cargarTodoDesdeNube();
    }
  };

  // --- RENDERING PRINCIPAL ---
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
            <div style={{ ...styleCrd, backgroundColor: '#ffffff10', textAlign: 'center', maxWidth: '350px', width: '90%' }}>
                <h2 style={{ color: '#fff', fontWeight: '900' }}>BÚNKER PRIVADO BJ</h2>
                <form onSubmit={intentarAcceso} style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
                    <input type="password" value={pinIngresado} onChange={(e) => setPinIngresado(e.target.value)} placeholder="CÓDIGO PIN" style={{...styleInp, textAlign: 'center', fontSize: '24px'}} />
                    <button type="submit" style={{ backgroundColor: FUCSIA_PRINCIPAL, color: '#fff', border: 'none', padding: '18px', borderRadius: '15px', fontWeight: '900', cursor: 'pointer' }}>ENTRAR 🔓</button>
                </form>
            </div>
        </div>
    );
  }

  if (cargando) return <div style={{ height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', color:FUCSIA_PRINCIPAL, fontWeight:'900' }}>RESTABLECIENDO BÚNKER... 🚀</div>;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FFF5F7', color: OSCURO_BJ, paddingBottom: '100px' }}>
      
      <header style={{ backgroundColor: '#ffffff', padding: '15px 5%', position: 'sticky', top: 0, zIndex: 1000, boxShadow: `0 4px 20px rgba(240, 16, 151, 0.1)` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <div>
                <h1 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '900', color: FUCSIA_PRINCIPAL }}>BJ MASTER CONTROL</h1>
                <small style={{ fontWeight: '900', opacity: 0.4 }}>Chiclayo, Perú</small>
            </div>
            <button onClick={cerrarSesion} style={{ backgroundColor: '#FEF2F2', color: ROJO_BJ, border: 'none', padding: '10px 15px', borderRadius: '12px', fontWeight: '900', cursor: 'pointer' }}>BLOQUEAR 🔒</button>
        </div>

        <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '10px' }}>
            <div style={{ backgroundColor: `${OSCURO_BJ}05`, padding: '10px 15px', borderRadius: '12px', border: '1px solid #eee', whiteSpace: 'nowrap' }}>
                <small style={{ fontSize: '10px', fontWeight: '900', opacity: 0.5, display: 'block' }}>COSTO TOTAL</small>
                <strong style={{ fontSize: '14px' }}>S/ {valorizacionStockBJ.cost.toFixed(2)}</strong>
            </div>
            <div style={{ backgroundColor: `${FUCSIA_PRINCIPAL}10`, padding: '10px 15px', borderRadius: '12px', border: `1px solid ${FUCSIA_PRINCIPAL}20`, whiteSpace: 'nowrap' }}>
                <small style={{ fontSize: '10px', fontWeight: '900', color: FUCSIA_PRINCIPAL, display: 'block' }}>VENTA PROYECTADA</small>
                <strong style={{ fontSize: '14px', color: FUCSIA_PRINCIPAL }}>S/ {valorizacionStockBJ.vent.toFixed(2)}</strong>
            </div>
            <div style={{ backgroundColor: `${VERDE_BJ}10`, padding: '10px 15px', borderRadius: '12px', border: `1px solid ${VERDE_BJ}20`, whiteSpace: 'nowrap' }}>
                <small style={{ fontSize: '10px', fontWeight: '900', color: VERDE_BJ, display: 'block' }}>GANANCIA POTENCIAL</small>
                <strong style={{ fontSize: '14px', color: VERDE_BJ }}>S/ {valorizacionStockBJ.pot.toFixed(2)}</strong>
            </div>
        </div>

        <nav style={{ display: 'flex', gap: '8px', overflowX: 'auto', marginTop: '10px' }}>
            {['ventas', 'stock', 'logistica', 'finanzas', 'clientes', 'contabilidad'].map(t => (
              <button key={t} onClick={() => setVista(t)} style={{ flex: '0 0 auto', backgroundColor: vista === t ? FUCSIA_PRINCIPAL : '#fff', color: vista === t ? '#fff' : FUCSIA_PRINCIPAL, border: `2px solid ${FUCSIA_PRINCIPAL}`, padding: '10px 20px', borderRadius: '15px', fontWeight: '900', fontSize: '11px', cursor: 'pointer' }}>
                {t === 'contabilidad' ? 'GESTIÓN' : t.toUpperCase()}
              </button>
            ))}
        </nav>
      </header>

      <main style={{ maxWidth: '1400px', margin: '20px auto', padding: '0 20px' }}>
        {vista === 'ventas' && <VentasSection {...{ balanceEliteBJ, handleUpdateItemVentaBJ, fechaConsulta, setFechaConsulta, efectivoRecibido, setEfectivoRecibido, handleExportarExcelCajaFull: ()=>{}, tipoVenta, setTipoVenta, cliente, handleAutocompleteCliente: handleAutocompleteClienteBJ, ventas, localidad, setLocalidad, telefono, setTelefono, carrito, setCarrito, descuento, setDescuento, handleEjecutarVentaBJ, busqueda, setBusqueda, productos, coloresElegidos, setColoresElegidos, cantidades, setCantidades, busquedaHistorial, setBusquedaHistorial, historialVentasDiaBJ, handleAnularVentaBJ, analiticaProBJ, FUCSIA_PRINCIPAL, VERDE_BJ, ROJO_BJ, AMARILLO_BJ, OSCURO_BJ, styleInp, styleCrd }} />}
        
        {vista === 'stock' && <AlmacenSection {...{ formProd, setFormProd, handleAddProductoBJ: async (e)=>{e.preventDefault(); await supabase.from('productos').insert([formProd]); setFormProd({nombre:'', precio_compra:'', precio_venta:'', precio_menor:'', stock:'', colores:''}); cargarTodoDesdeNube();}, productos, idEditProducto, setIdEditProducto, formEditProducto, setFormEditProducto, handleUpdateProductoBJ: async (id)=>{await supabase.from('productos').update(formEditProducto).eq('id',id); setIdEditProducto(null); cargarTodoDesdeNube();}, handleDeleteProductoBJ: async (id,n)=>{if(confirm(`¿Borrar ${n}?`)){await supabase.from('productos').delete().eq('id',id); cargarTodoDesdeNube();}}, formEditStockBJ, setFormEditStockBJ, handleSincronizarStockBJ: async (id,s)=>{await supabase.from('productos').update({stock:Number(s)}).eq('id',id); cargarTodoDesdeNube();}, FUCSIA_PRINCIPAL, VERDE_BJ, ROJO_BJ, OSCURO_BJ, styleInp, styleCrd }} />}
        
        {vista === 'logistica' && <LogisticaSection {...{ logisticaInteligente, handleCobrarDeudaBJ: async (g,m)=>{const pre=balanceEliteBJ.cG; for(let id of g.items_ids){await supabase.from('ventas').update({estado_pedido:'Entregado'}).eq('id',id);} if(Number(m)>0){await supabase.from('auditoria_bj').insert([{cliente:g.cliente,operacion:'COBRO SALDO',monto_operacion:Number(m),caja_antes:pre,caja_despues:pre+Number(m)}]);} cargarTodoDesdeNube();}, handleAnularCreditoBJ: async (g)=>{for(const it of g.items){const pO=productos.find(p=>p.id===it.producto_id); if(pO) await supabase.from('productos').update({stock:pO.stock+it.cantidad}).eq('id',pO.id);} await supabase.from('ventas').delete().in('id',g.items_ids); cargarTodoDesdeNube();}, handleEliminarItemIndividualLogistica: async (v)=>{const pO=productos.find(p=>p.id===v.producto_id); if(pO) await supabase.from('productos').update({stock:pO.stock+v.cantidad}).eq('id',pO.id); await supabase.from('ventas').update({ estado_pedido: 'Anulado' }).eq('id', v.id); cargarTodoDesdeNube();}, productos, FUCSIA_PRINCIPAL, VERDE_BJ, AMARILLO_BJ, ROJO_BJ, OSCURO_BJ, styleCrd, styleInp }} />}

        {vista === 'finanzas' && <FinanzasSection {...{ ventas, productos, finanzas, balanceEliteBJ, FUCSIA_PRINCIPAL, VERDE_BJ, ROJO_BJ, AMARILLO_BJ, OSCURO_BJ, styleInp, styleCrd }} />}
        {vista === 'clientes' && <ClientesSection {...{ ventas, FUCSIA_PRINCIPAL, VERDE_BJ, OSCURO_BJ, styleCrd, styleInp }} />}
        {vista === 'contabilidad' && <GestionSection {...{ balanceEliteBJ, valorizacionStockBJ, analiticaProBJ, finanzas, handleRegistrarFinanzaBJ, FUCSIA_PRINCIPAL, VERDE_BJ, ROJO_BJ, AMARILLO_BJ, OSCURO_BJ, styleInp, styleCrd }} />}
      
      </main>
    </div>
  );
}