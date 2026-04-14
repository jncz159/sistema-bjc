"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from './supabaseClient';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid, Cell 
} from 'recharts';

/**
 * ============================================================
 * SISTEMA BJ IMPORTACIONES CHICLAYO - VERSIÓN ARQUITECTO
 * VERSION: 75.0 - BUNKER ARQUITECTO PRO (EXPANDIDO)
 * ESTADO: LOGÍSTICA DETALLADA + BLINDAJE DE FUNCIONES
 * ============================================================
 */

export default function SistemaBJCMasterFinal() {
  
  // ============================================================
  // [ZONA: HELPERS Y UTILIDADES]
  // Si quieres cambiar formatos de fecha u hora, es aquí.
  // ============================================================

  const getFechaPeru = (dateInput) => {
    try {
        const fechaBase = dateInput ? new Date(dateInput) : new Date();
        if (isNaN(fechaBase.getTime())) return new Date().toISOString().split('T')[0];
        const opcionesLocal = { timeZone: "America/Lima", year: 'numeric', month: '2-digit', day: '2-digit' };
        const formateadorBJ = new Intl.DateTimeFormat('en-CA', opcionesLocal);
        const partesBJ = formateadorBJ.formatToParts(fechaBase);
        const anioBJ = partesBJ.find(p => p.type === 'year')?.value || "2026";
        const mesBJ = partesBJ.find(p => p.type === 'month')?.value || "01";
        const diaBJ = partesBJ.find(p => p.type === 'day')?.value || "01";
        return `${anioBJ}-${mesBJ}-${diaBJ}`;
    } catch (e) { return new Date().toISOString().split('T')[0]; }
  };

  const getHoraPeru = (dateInput) => {
    if (!dateInput) return "--:--";
    try {
        const dH = new Date(dateInput);
        if (isNaN(dH.getTime())) return "--:--";
        return dH.toLocaleTimeString('es-PE', { timeZone: "America/Lima", hour: '2-digit', minute: '2-digit', hour12: true });
    } catch (e) { return "--:--"; }
  };

  const handleInputMonto = (v) => {
    if (v === undefined || v === null) return "";
    const aTexto = String(v);
    const conPunto = aTexto.replace(',', '.');
    return conPunto.replace(/[^0-9.]/g, '');
  };

  const getEtiquetaProducto = (f) => {
    if (!f) return null;
    try {
        const diff = Math.floor((new Date() - new Date(f)) / (1000 * 60 * 60 * 24));
        if (diff <= 3) return { tipo: 'NUEVO', icono: '✨', color: '#F01097' };
        if (diff <= 8) return { tipo: 'RECIENTE', icono: '📦', color: '#A13C6D' };
        return null;
    } catch (e) { return null; }
  };

  // ============================================================
  // [ZONA: ESTADOS DEL SISTEMA]
  // Si quieres agregar nuevos campos o formularios, añade estados aquí.
  // ============================================================

  const [productos, setProductos] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [finanzas, setFinanzas] = useState([]);
  const [vista, setVista] = useState('ventas'); 
  const [cargando, setCargando] = useState(true);
  
  const [busqueda, setBusqueda] = useState(''); 
  const [fechaConsulta, setFechaConsulta] = useState(getFechaPeru());
  
  const [cliente, setCliente] = useState('');
  const [localidad, setLocalidad] = useState(''); 
  const [telefono, setTelefono] = useState(''); 
  const [tipoVenta, setTipoVenta] = useState('Mayor'); 
  const [cantidades, setCantidades] = useState({});
  const [coloresElegidos, setColoresElegidos] = useState({});
  const [carrito, setCarrito] = useState([]);
  const [descuento, setDescuento] = useState(0); 

  const [idItemVentaEditando, setIdItemVentaEditando] = useState(null); 
  const [nuevaCantVenta, setNuevaCantVenta] = useState(0);
  const [formProd, setFormProd] = useState({ nombre: '', precio_compra: '', precio_venta: '', precio_menor: '', stock: '', colores: '' });
  const [formFinanzas, setFormFinanzas] = useState({ tipo: 'Gasto Local', descripcion: '', monto: '', origen: 'Caja Global' });

  const FUCSIA_PRINCIPAL = '#F01097';
  const VERDE_BJ = '#16A34A';
  const ROJO_BJ = '#E11D48';
  const AMARILLO_BJ = '#CA8A04';
  const OSCURO_BJ = '#1E1B1C';

  // ============================================================
  // [ZONA: FUNCIONES DE ACCIÓN (LÓGICA OPERATIVA)]
  // Aquí se programa qué pasa cuando haces clic en "Vender" o "Guardar".
  // ============================================================

  const handleAutocompleteCliente = (e) => {
    const valInput = e.target.value; setCliente(valInput);
    const mCli = (ventas || []).find(v => v && v.cliente_nombre?.toLowerCase() === valInput.toLowerCase());
    if (mCli) { setLocalidad(mCli.localidad || ''); setTelefono(mCli.telefono || ''); }
  };

  const handleEjecutarVentaBJ = async (estadoOperativo) => {
    if (!cliente || !localidad || !carrito.length) return alert("Completa cliente, zona y productos.");
    
    const totalV = carrito.reduce((acc, i) => acc + (Number(i.precio_venta) * i.cantidad), 0);
    const ratioD = totalV > 0 ? (Number(descuento) / totalV) : 0;

    const listaV = carrito.map(i => {
        const pv = Number(i.precio_venta);
        const pc = Number(i.precio_compra || 0);
        return { 
            cliente_nombre: cliente, localidad, telefono, producto_id: i.producto_id, 
            cantidad: i.cantidad, color: i.color, precio_venta_unitario: pv, 
            precio_costo_unitario: pc, 
            ganancia_total: ((pv - pc) * i.cantidad) - ((pv * i.cantidad) * ratioD), 
            estado_pedido: estadoOperativo 
        };
    });

    const { error } = await supabase.from('ventas').insert(listaV);
    if (!error) {
      for (const item of carrito) {
        const pO = productos.find(p => p.id === item.producto_id);
        if (pO) await supabase.from('productos').update({ stock: pO.stock - item.cantidad }).eq('id', item.producto_id);
      }
      setCliente(''); setLocalidad(''); setTelefono(''); setCarrito([]); setDescuento(0);
      alert("✅ Operación guardada."); await cargarTodoDesdeNube();
    } else { alert("Error al guardar venta."); }
  };

  const handleAddProductoBJ = async (e) => {
    if(e) e.preventDefault();
    if (!formProd.nombre) return alert("Nombre obligatorio.");
    const { error } = await supabase.from('productos').insert([{
        nombre: formProd.nombre, 
        precio_compra: Number(handleInputMonto(formProd.precio_compra)),
        precio_venta: Number(handleInputMonto(formProd.precio_venta)), 
        precio_menor: Number(handleInputMonto(formProd.precio_menor)),
        stock: Number(formProd.stock), 
        colores: formProd.colores
    }]);
    if (!error) { setFormProd({ nombre: '', precio_compra: '', precio_venta: '', precio_menor: '', stock: '', colores: '' }); alert("✨ Modelo creado."); await cargarTodoDesdeNube(); }
  };

  const handleRegistrarFinanzaBJ = async (e) => {
    if(e) e.preventDefault();
    const cl_M = handleInputMonto(formFinanzas.monto);
    if (!cl_M) return alert("Ingresa un monto.");
    const { error } = await supabase.from('finanzas').insert([{
        tipo: formFinanzas.tipo, descripcion: formFinanzas.descripcion, monto: Number(cl_M), origen: formFinanzas.origen 
    }]);
    if (!error) { setFormFinanzas({tipo:'Gasto Local', descripcion:'', monto:'', origen: 'Caja Global'}); alert("✅ Registro guardado."); await cargarTodoDesdeNube(); }
  };

  const handleCobrarDeudaBJ = async (grupo) => {
    if(confirm(`¿Registrar cobro total de S/ ${grupo.total.toFixed(2)}?`)) {
        const idsVentas = grupo.items_ids || [];
        for(let id of idsVentas) {
            await supabase.from('ventas').update({ estado_pedido: 'Entregado' }).eq('id', id);
        }
        alert("💰 Pago recibido correctamente."); await cargarTodoDesdeNube();
    }
  };

  const handleAnularVentaBJ = async (v) => {
    if (confirm("¿Anular este ítem? El stock volverá al inventario.")) {
      const pc = productos.find(pr => pr.id === v.producto_id);
      if (pc) await supabase.from('productos').update({ stock: pc.stock + v.cantidad }).eq('id', pc.id);
      await supabase.from('ventas').delete().eq('id', v.id);
      await cargarTodoDesdeNube();
    }
  };

  // ============================================================
  // [ZONA: LÓGICA DE PROCESAMIENTO (MEMOS)]
  // Aquí se calculan balances, filtros de logística y rankings.
  // ============================================================

  // --- LOGÍSTICA REPARADA CON DETALLE DE PRODUCTOS ---
  const logisticaInteligente = useMemo(() => {
    const resLog = { almacen: [], deudas: [] };
    if (!ventas || ventas.length === 0) return resLog;

    try {
        const mA = {}; const mD = {};

        ventas.forEach(v => {
            if (!v || !v.cliente_nombre) return;
            const key = `${v.cliente_nombre}-${v.localidad || 'SN'}`;
            
            // Buscamos el nombre del modelo
            const pMatch = productos.find(p => p.id === v.producto_id);
            const itemDetalle = {
                id: v.id,
                nombre: pMatch ? pMatch.nombre : "Producto Eliminado",
                cantidad: v.cantidad,
                color: v.color
            };

            if (v.estado_pedido === 'En Almacén') {
                if (!mA[key]) mA[key] = { cliente: v.cliente_nombre, localidad: v.localidad, telefono: v.telefono, items: [], total: 0, items_ids: [] };
                mA[key].items.push(itemDetalle);
                mA[key].items_ids.push(v.id);
                mA[key].total += (Number(v.precio_venta_unitario || 0) * Number(v.cantidad || 0));
            }
            
            if (v.estado_pedido === 'Pendiente de Pago') {
                if (!mD[key]) mD[key] = { cliente: v.cliente_nombre, localidad: v.localidad, telefono: v.telefono, items: [], total: 0, items_ids: [] };
                mD[key].items.push(itemDetalle);
                mD[key].items_ids.push(v.id);
                mD[key].total += (Number(v.precio_venta_unitario || 0) * Number(v.cantidad || 0));
            }
        });

        resLog.almacen = Object.values(mA);
        resLog.deudas = Object.values(mD);
        return resLog;
    } catch (e) { return resLog; }
  }, [ventas, productos]);

  const historialVentasDiaBJ = useMemo(() => {
    if (!Array.isArray(ventas) || ventas.length === 0) return [];
    try {
        const filt = ventas.filter(v => v && getFechaPeru(v.created_at) === fechaConsulta);
        const grupos = {};
        filt.forEach(v => {
            const hU = v.created_at ? v.created_at.substring(0,16) : "0000";
            const id = `${v.cliente_nombre || 'SN'}-${v.localidad || 'SZ'}-${hU}`; 
            if (!grupos[id]) grupos[id] = { id_grupo: id, cliente_nombre: v.cliente_nombre, localidad: v.localidad, telefono: v.telefono, hora: getHoraPeru(v.created_at), total: 0, items: [] };
            grupos[id].items.push(v); grupos[id].total += (Number(v.precio_venta_unitario ?? 0) * Number(v.cantidad ?? 0));
        });
        return Object.values(grupos).reverse();
    } catch (e) { return []; }
  }, [ventas, fechaConsulta]);

  const balanceEliteBJ = useMemo(() => {
    const safe = { cH: 0, gH: 0, cG: 0, bR: 0, pe_p: 0, pe_g: 0, pe_m: 0 };
    if (!ventas.length || !finanzas.length) return safe;
    try {
        const hoy = getFechaPeru();
        const mes = hoy.substring(0,7);
        const vH = ventas.filter(v => v && getFechaPeru(v.created_at) === hoy && v.estado_pedido !== 'Pendiente de Pago');
        const gB = ventas.reduce((acc, v) => acc + (Number(v?.ganancia_total) || 0), 0);
        const rG = finanzas.filter(f => f && f.origen === 'Ganancias').reduce((acc, f) => acc + (Number(f.monto) || 0), 0);
        const inS = ventas.filter(v => v && v.estado_pedido !== 'Pendiente de Pago').reduce((acc, v) => acc + (Number(v.precio_venta_unitario || 0) * Number(v.cantidad || 0)), 0);
        const inK = finanzas.filter(f => f && ['Ingreso Adicional','Inversión Inicial'].includes(f.tipo)).reduce((acc, f) => acc + (Number(f.monto) || 0), 0);
        const outG = finanzas.filter(f => f && ['Gasto Local','Inversión (Mercadería)','Retiro Personal'].includes(f.tipo)).reduce((acc, f) => acc + (Number(f.monto) || 0), 0);
        const eM = finanzas.filter(f => f && getFechaPeru(f.created_at).substring(0,7) === mes && ['Gasto Local','Retiro Personal'].includes(f.tipo)).reduce((acc, f) => acc + (Number(f.monto) || 0), 0);
        const gM = ventas.filter(v => v && getFechaPeru(v.created_at).substring(0,7) === mes && v.estado_pedido !== 'Pendiente de Pago').reduce((a,b) => a + (Number(b.ganancia_total) || 0), 0);
        return { 
            cH: vH.reduce((acc, v) => acc + (Number(v.precio_venta_unitario ?? 0) * Number(v.cantidad ?? 0)), 0),
            gH: vH.reduce((acc, v) => acc + Number(v.ganancia_total || 0), 0),
            cG: (inS + inK - outG),
            bR: (gB - rG),
            pe_p: eM > 0 ? (gM / eM) * 100 : (gM > 0 ? 100 : 0),
            pe_g: gM, pe_m: eM
        };
    } catch (e) { return safe; }
  }, [finanzas, ventas]);

  const valStock = useMemo(() => {
    let c = 0; let v = 0;
    productos.forEach(p => { if (p && Number(p.stock) > 0) { c += (Number(p.precio_compra || 0) * p.stock); v += (Number(p.precio_venta || 0) * p.stock); } });
    return { cost: c, vent: v };
  }, [productos]);

  const seriesRankingBJ = useMemo(() => {
    try {
        const dict = {};
        ventas.forEach(v => { 
            const pMatch = productos.find(x => x.id === v.producto_id); 
            const n = pMatch ? pMatch.nombre : "Modelo Eliminado"; 
            dict[n] = (dict[n] || 0) + Number(v.ganancia_total || 0); 
        });
        return Object.entries(dict).sort((a,b) => b[1] - a[1]).slice(0, 5);
    } catch (e) { return []; }
  }, [ventas, productos]);

  // ============================================================
  // [ZONA: DB Y EXPORTACIÓN]
  // ============================================================

  const cargarTodoDesdeNube = async () => {
    try {
        const { data: p } = await supabase.from('productos').select('*').order('created_at', { ascending: false });
        const { data: v } = await supabase.from('ventas').select('*').order('created_at', { ascending: true });
        const { data: f } = await supabase.from('finanzas').select('*').order('created_at', { ascending: false });
        if (p) setProductos(p); if (v) setVentas(v); if (f) setFinanzas(f);
    } catch (e) { console.error(e); }
    finally { setCargando(false); }
  };

  const handleExportarExcelAuditoria = () => {
    let csvFinal = "REPORTE DE AUDITORIA Y CIERRE DIARIO - BJ IMPORTACIONES\n";
    csvFinal += `FECHA: ${fechaConsulta}\n`;
    csvFinal += `--------------------------------------------------\n`;
    csvFinal += `SALDO CAJA GLOBAL,S/ ${balanceEliteBJ.cG.toFixed(2)}\n`;
    csvFinal += `BOVEDA UTILIDADES DISPO,S/ ${balanceEliteBJ.bR.toFixed(2)}\n`;
    csvFinal += `VENTAS DIA (EFECTIVO),S/ ${balanceEliteBJ.cH.toFixed(2)}\n`;
    csvFinal += `GANANCIA NETA DIA,S/ ${balanceEliteBJ.gH.toFixed(2)}\n`;
    csvFinal += `--------------------------------------------------\n\n`;
    csvFinal += "Hora,Cliente,Zona,Producto,Variante,Cant,Precio,Subtotal\n";
    
    ventas.filter(v => getFechaPeru(v.created_at) === fechaConsulta).forEach(v => {
      const nomP = productos.find(p=>p.id===v.producto_id)?.nombre || "Modelo";
      csvFinal += `${getHoraPeru(v.created_at)},${v.cliente_nombre},${v.localidad},${nomP},${v.color},${v.cantidad},${v.precio_venta_unitario},${(v.precio_venta_unitario*v.cantidad).toFixed(2)}\n`;
    });

    const blobOBJ = new Blob([csvFinal], { type: 'text/csv;charset=utf-8;' });
    const linkB = document.createElement("a"); linkB.href = URL.createObjectURL(blobOBJ);
    linkB.download = `BJ_CIERRE_${fechaConsulta}.csv`; linkB.click();
  };

  useEffect(() => {
    cargarTodoDesdeNube();
    const arranqueForzado = setTimeout(() => setCargando(false), 4000);
    return () => clearTimeout(arranqueForzado);
  }, []);

  // ============================================================
  // [ZONA: INTERFAZ DE USUARIO (DISEÑO)]
  // ============================================================

  const sInp_BJ = { padding: '16px', borderRadius: '16px', border: `2px solid #FCC2E2`, width: '100%', outline: 'none', fontSize: '15px', boxSizing: 'border-box', backgroundColor: '#fff' };
  const sCrd_BJ = { backgroundColor: '#ffffff', borderRadius: '35px', padding: '35px', boxShadow: `0 20px 40px rgba(247, 134, 193, 0.1)`, border: '1px solid #FFF1F2' };

  if (cargando) return (
    <div style={{ height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', backgroundColor:'#FFF5F7', color:FUCSIA_PRINCIPAL, fontWeight:'900', fontSize:'1.5rem' }}>
        INICIANDO BUNKER BJ ELITE v75... 🚀💎
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FFF5F7', color: OSCURO_BJ, fontFamily: 'system-ui, sans-serif' }}>
      
      {/* 🚀 NAVBAR PRINCIPAL FULL */}
      <header style={{ backgroundColor: '#ffffff', padding: '20px 5%', position: 'sticky', top: 0, zIndex: 100, display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: `0 4px 15px rgba(0,0,0,0.06)`, flexWrap: 'wrap', gap: '15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ backgroundColor: FUCSIA_PRINCIPAL, color: '#fff', width: '48px', height: '48px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '1.4rem' }}>BJ</div>
          <div><h1 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '900', color: FUCSIA_PRINCIPAL }}>BJ IMPORTACIONES</h1><small style={{ color: '#64748B', fontWeight: '900', fontSize: '10px' }}>v75 MASTER ARQUITECTO</small></div>
        </div>
        <nav style={{ display: 'flex', gap: '10px', backgroundColor: `#FCA5D415`, padding: '6px', borderRadius: '18px' }}>
          <button onClick={() => setVista('ventas')} style={{ backgroundColor: vista === 'ventas' ? FUCSIA_PRINCIPAL : 'transparent', border: 'none', color: vista === 'ventas' ? '#fff' : FUCSIA_PRINCIPAL, padding: '12px 22px', borderRadius: '12px', cursor: 'pointer', fontWeight: '900' }}>VENTAS</button>
          <button onClick={() => setVista('logistica')} style={{ backgroundColor: vista === 'logistica' ? OSCURO_BJ : 'transparent', border: 'none', color: vista === 'logistica' ? '#fff' : OSCURO_BJ, padding: '12px 22px', borderRadius: '12px', cursor: 'pointer', fontWeight: '900' }}>LOGÍSTICA</button>
          <button onClick={() => setVista('contabilidad')} style={{ backgroundColor: vista === 'contabilidad' ? FUCSIA_PRINCIPAL : 'transparent', border: 'none', color: vista === 'contabilidad' ? '#fff' : FUCSIA_PRINCIPAL, padding: '12px 22px', borderRadius: '12px', cursor: 'pointer', fontWeight: '900' }}>GESTIÓN</button>
        </nav>
      </header>

      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '30px 20px' }}>
        
        {/* ===================== [ZONA: VISTA VENTAS] ===================== */}
        {vista === 'ventas' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '35px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '25px' }}>
              <div style={sCrd_BJ}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: FUCSIA_PRINCIPAL, fontWeight: '900', fontSize: '13px' }}>💰 CAJA EFECTIVO HOY (LIQUIDO)</span>
                    <button onClick={handleExportarExcelAuditoria} style={{ background:`${FUCSIA_PRINCIPAL}20`, border:'none', padding:'8px 15px', borderRadius:'10px', color:FUCSIA_PRINCIPAL, fontWeight:'900', fontSize:'10px', cursor:'pointer' }}>CIERRE AUDITOR</button>
                </div>
                <h2 style={{ margin: '15px 0', fontSize: '3.5rem', fontWeight: '900' }}>S/ {balanceEliteBJ.cH.toFixed(2)}</h2>
                <div style={{ color: VERDE_BJ, fontWeight: '900', fontSize: '15px' }}>Ganancia Día: S/ {balanceEliteBJ.gH.toFixed(2)}</div>
              </div>
              <div style={sCrd_BJ}>
                <span style={{ color: FUCSIA_PRINCIPAL, fontWeight: '900', fontSize: '13px' }}>📅 BUSCAR HISTORIAL BJ</span>
                <input type="date" value={fechaConsulta} onChange={e => setFechaConsulta(e.target.value)} style={{ ...sInp_BJ, marginTop: '15px' }} />
              </div>
            </div>

            <div style={{ ...sCrd_BJ, border: `3px solid #FCA5D4` }}>
              <h3 style={{ margin: 0, color: FUCSIA_PRINCIPAL, fontWeight: '900', marginBottom:'25px' }}>🛒 Registrar Operación Chiclayo</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px', marginBottom: '30px' }}>
                <input list="clis_v75" placeholder="👤 Cliente" value={cliente} onChange={handleAutocompleteCliente} style={sInp_BJ} />
                <datalist id="clis_v75">{[...new Set(ventas.map(v => v.cliente_nombre))].map((c, i) => <option key={i} value={c} />)}</datalist>
                <input placeholder="📍 Zona" value={localidad} onChange={e => setLocalidad(e.target.value)} style={sInp_BJ} />
                <input placeholder="📱 WhatsApp" value={telefono} onChange={e => setTelefono(e.target.value)} style={sInp_BJ} />
              </div>

              {carrito.length > 0 && (
                <div style={{ backgroundColor: '#FFF9FB', border: `3px dashed ${FUCSIA_PRINCIPAL}`, borderRadius: '25px', padding: '30px', marginBottom: '40px' }}>
                  {carrito.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #FCC2E2', paddingBottom: '15px', marginBottom: '12px' }}>
                      <div style={{ flex: 1 }}><strong>{item.cantidad}x</strong> {item.nombre} <br/><small style={{ color: FUCSIA_PRINCIPAL, fontWeight: '900' }}>COLOR: {item.color}</small></div>
                      <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                        <input type="text" value={item.precio_venta} onChange={(e) => { const n = [...carrito]; n[idx].precio_venta = handleInputMonto(e.target.value); setCarrito(n); }} style={{ width: '80px', borderRadius: '10px', border: '1px solid #FCA5D4', textAlign: 'center', fontSize: '17px', fontWeight: '900' }} />
                        <button onClick={() => { const n = [...carrito]; n.splice(idx, 1); setCarrito(n); }} style={{ color: '#fff', backgroundColor: FUCSIA_PRINCIPAL, border: 'none', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer' }}>X</button>
                      </div>
                    </div>
                  ))}
                  <div style={{ textAlign: 'right', marginTop: '30px' }}>
                    <span style={{ fontSize: '14px', fontWeight: '900' }}>DSCTO S/ </span>
                    <input type="text" value={descuento} onChange={e=>setDescuento(handleInputMonto(e.target.value))} style={{ width: '130px', padding: '12px', borderRadius: '15px', border: `2px solid ${FUCSIA_PRINCIPAL}`, textAlign: 'center', fontWeight: '900', fontSize:'20px' }} />
                    <h3 style={{ margin: '10px 0', fontSize: '2.8rem', fontWeight: '900' }}>Total: S/ {(carrito.reduce((acc, i) => acc + (Number(i.precio_venta) * i.cantidad), 0) - Number(descuento)).toFixed(2)}</h3>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginTop: '20px' }}>
                    <button onClick={() => handleEjecutarVentaBJ('Entregado')} style={{ backgroundColor: OSCURO_BJ, color: '#fff', border: 'none', padding: '20px', borderRadius: '22px', fontWeight: '900', cursor: 'pointer', fontSize: '14px' }}>✅ PAGADO/ENTREGA</button>
                    <button onClick={() => handleEjecutarVentaBJ('En Almacén')} style={{ backgroundColor: FUCSIA_PRINCIPAL, color: '#fff', border: 'none', padding: '20px', borderRadius: '22px', fontWeight: '900', cursor: 'pointer', fontSize: '14px' }}>📦 PAGADO/ALMACÉN</button>
                    <button onClick={() => handleEjecutarVentaBJ('Pendiente de Pago')} style={{ backgroundColor: AMARILLO_BJ, color: '#fff', border: 'none', padding: '20px', borderRadius: '22px', fontWeight: '900', cursor: 'pointer', fontSize: '14px' }}>💸 DAR A PAGAR (CRÉDITO)</button>
                  </div>
                </div>
              )}

              <input placeholder="🔍 Buscar modelo..." value={busqueda} onChange={e => setBusqueda(e.target.value)} style={{ ...sInp_BJ, marginBottom: '25px', height: '65px' }} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '25px', maxHeight: '750px', overflowY: 'auto' }}>
                {productos.filter(p => p.nombre?.toLowerCase().includes(busqueda.toLowerCase())).map((p) => {
                  const tagBJ = getEtiquetaProducto(p.created_at);
                  const pShowBJ = tipoVenta === 'Mayor' ? p.precio_venta : (p.precio_menor || p.precio_venta);
                  const sLowBJ = Number(p.stock || 0) < 5;
                  return (
                    <div key={p.id} style={{ border: sLowBJ ? `2px solid ${ROJO_BJ}` : '1px solid #FFF1F2', padding: '22px', borderRadius: '35px', backgroundColor: '#fff', position: 'relative', boxShadow: '0 10px 30px rgba(0,0,0,0.04)' }}>
                      {tagBJ && <span style={{ position:'absolute', top: '-15px', left: '20px', backgroundColor: tagBJ.color, color: '#fff', fontSize: '10px', padding: '6px 15px', borderRadius: '15px', fontWeight: '900', zIndex: 10 }}>{tagBJ.tipo}</span>}
                      <strong style={{ display: 'block', height: '45px', overflow: 'hidden', fontSize: '16px' }}>{p.nombre}</strong>
                      <div style={{ margin: '10px 0', padding: '10px', backgroundColor: sLowBJ ? '#FFF1F2' : '#F0FDF4', borderRadius: '18px', textAlign: 'center' }}>
                        <span style={{ fontSize: '13px', fontWeight: '900', color: sLowBJ ? ROJO_BJ : VERDE_BJ }}>STOCK: {p.stock} U.</span>
                      </div>
                      <select value={coloresElegidos[p.id]} onChange={e => setColoresElegidos({...coloresElegidos, [p.id]: e.target.value})} style={{ ...sInp_BJ, padding: '10px', fontSize: '14px', marginBottom: '18px', height: '50px' }}>
                        {p.colores?.split(',').map(c => <option key={c} value={c.trim()}>{c.trim()}</option>)}
                      </select>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '18px', marginBottom: '22px' }}>
                        <button onClick={() => setCantidades({...cantidades, [p.id]: Math.max(1, (cantidades[p.id] || 1) - 1)})} style={{ border: 'none', background: '#f5f5f5', borderRadius: '12px', width: '48px', height: '48px', cursor:'pointer' }}>-</button>
                        <span style={{ fontWeight: '900', fontSize: '22px', paddingTop:'10px' }}>{cantidades[p.id] || 1}</span>
                        <button onClick={() => setCantidades({...cantidades, [p.id]: Math.min(p.stock, (cantidades[p.id] || 1) + 1)})} style={{ border: 'none', background: '#f5f5f5', borderRadius: '12px', width: '48px', height: '48px', cursor:'pointer' }}>+</button>
                      </div>
                      <button onClick={() => {
                          const cE = Number(cantidades[p.id] || 1);
                          const pE = tipoVenta === 'Mayor' ? p.precio_venta : (p.precio_menor || p.precio_venta);
                          const enC = carrito.filter(i => i.producto_id === p.id).reduce((acc, i) => acc + i.cantidad, 0);
                          if ((Number(p.stock) || 0) < cE + enC) return alert("¡Sin stock!");
                          setCarrito([...carrito, { producto_id: p.id, nombre: p.nombre, cantidad: cE, color: (coloresElegidos[p.id] || "Único"), precio_venta: pE, precio_compra: p.precio_compra }]);
                      }} disabled={p.stock <= 0} style={{ width: '100%', backgroundColor: tipoVenta === 'Mayor' ? OSCURO_BJ : '#A13C6D', color: '#fff', border: 'none', padding: '18px', borderRadius: '22px', fontSize: '14px', fontWeight: '900', cursor:'pointer' }}>
                        {p.stock > 0 ? `VENDER S/ ${Number(pShowBJ).toFixed(2)}` : 'AGOTADO'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={sCrd_BJ}>
                <h4 style={{margin:0, color:'#64748B', fontWeight:'900', fontSize:'13px', textTransform:'uppercase', marginBottom:'25px'}}>📜 Historial de Operaciones Diarias</h4>
                {historialVentasDiaBJ.map(grupo => (
                    <div key={grupo.id_grupo} style={{ padding: '25px', backgroundColor: '#FFF5F7', borderRadius: '25px', border: `1px solid #FCC2E2`, marginBottom:'20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                            <div>
                                <small style={{ fontWeight:'900', color: FUCSIA_PRINCIPAL }}>⏰ HORA: {grupo.hora}</small>
                                <br/><strong style={{ color: OSCURO_BJ, fontSize: '22px' }}>{grupo.cliente_nombre}</strong>
                                <br/><small>📍 {grupo.localidad} | 📱 {grupo.telefono}</small>
                            </div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <div style={{ backgroundColor: VERDE_BJ, color: '#fff', padding: '10px 20px', borderRadius: '12px', fontWeight: '900' }}>S/ {grupo.total.toFixed(2)}</div>
                                <button onClick={() => {
                                    let msgBJ = `¡Hola *${grupo.cliente_nombre}*! 👋 Recibo de BJ Importaciones Chiclayo.%0A%0A`;
                                    grupo.items.forEach(v => {
                                        const pR = productos.find(p => p.id === v.producto_id);
                                        msgBJ += `- *${v.cantidad}x* ${pR?.nombre || 'Item'} (${v.color}): S/ ${(v.precio_venta_unitario * v.cantidad).toFixed(2)}%0A`;
                                    });
                                    msgBJ += `%0A*TOTAL PAGADO: S/ ${grupo.total.toFixed(2)}*%0A¡Muchas gracias! 😊`;
                                    window.open(`https://wa.me/51${grupo.telefono?.replace(/\D/g,'')}?text=${msgBJ}`, '_blank');
                                }} style={{ backgroundColor: '#25D366', color: '#fff', border: 'none', padding: '10px 15px', borderRadius: '12px', fontWeight:'900', cursor:'pointer' }}>TICKET 📱</button>
                            </div>
                        </div>
                        <div style={{marginTop:'15px'}}>{grupo.items.map(v => (
                            <div key={v.id} style={{background:'#fff', padding:'10px 20px', borderRadius:'15px', marginBottom:'8px', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                                <div><small>{v.cantidad}x {productos.find(p=>p.id===v.producto_id)?.nombre || 'Item'} ({v.color}) | <span style={{color: v.estado_pedido==='Pendiente de Pago' ? AMARILLO_BJ : '#64748B'}}>{v.estado_pedido}</span></small></div>
                                <div style={{display:'flex', gap:'15px', alignItems:'center'}}>
                                    <strong>S/ {(v.precio_venta_unitario * v.cantidad).toFixed(2)}</strong>
                                    <button onClick={()=>handleAnularVentaBJ(v)} style={{border:'none', background:'none', color:ROJO_BJ, fontWeight:'bold', cursor:'pointer'}}>🗑️</button>
                                </div>
                            </div>
                        ))}</div>
                    </div>
                ))}
            </div>
          </div>
        )}

        {/* ===================== [ZONA: VISTA LOGÍSTICA (DETALLADA)] ===================== */}
        {vista === 'logistica' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '35px' }}>
            <div style={sCrd_BJ}>
                <h3 style={{ margin: 0, fontSize: '1.6rem', fontWeight: '900', color: FUCSIA_PRINCIPAL, marginBottom:'25px' }}>📦 Entregas Pendientes (Pagado en Local)</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
                    {logisticaInteligente.almacen.map((grupo, idx) => (
                        <div key={idx} style={{ padding: '25px', border: '2px solid #F1F5F9', borderRadius: '25px', backgroundColor: '#fff' }}>
                            <div style={{display:'flex', justifyContent:'space-between', marginBottom:'15px'}}>
                                <div>
                                    <strong style={{fontSize:'1.2rem'}}>{grupo.cliente}</strong>
                                    <br/><small style={{color: '#64748B'}}>📍 {grupo.localidad}</small>
                                </div>
                                <button onClick={() => {
                                    let listaWA = grupo.items.map(i => `${i.cantidad}x ${i.nombre}`).join(', ');
                                    let m = `¡Hola *${grupo.cliente}*! 👋 Tu pedido de: ${listaWA} ya está listo en BJ Importaciones. ✨`;
                                    window.open(`https://wa.me/51${grupo.telefono?.replace(/\D/g,'')}?text=${encodeURI(m)}`, '_blank');
                                }} style={{ background:'#25D366', color:'#fff', border:'none', padding:'10px 15px', borderRadius:'12px', fontWeight:'900', cursor:'pointer' }}>AVISAR 📱</button>
                            </div>

                            {/* DETALLE DE PRODUCTOS */}
                            <div style={{ background: '#F8FAFC', padding: '15px', borderRadius: '18px', marginBottom: '15px', border: '1px dashed #CBD5E1' }}>
                                <small style={{ fontWeight: '900', color: '#64748B', display: 'block', marginBottom: '8px', textTransform: 'uppercase', fontSize: '10px' }}>Mercadería a entregar:</small>
                                {grupo.items.map((it, i) => (
                                    <div key={i} style={{ fontSize: '14px', marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
                                        <span><strong>{it.cantidad}x</strong> {it.nombre}</span>
                                        <span style={{ color: FUCSIA_PRINCIPAL, fontWeight: '700', fontSize: '11px' }}>{it.color}</span>
                                    </div>
                                ))}
                            </div>

                            <button onClick={async () => {
                                if(confirm("¿Confirmar que entregaste toda esta mercadería física?")) {
                                    const idsEntregar = ventas.filter(v => v.cliente_nombre === grupo.cliente && v.localidad === grupo.localidad && v.estado_pedido === 'En Almacén').map(v => v.id);
                                    for(let idV of idsEntregar) {
                                        await supabase.from('ventas').update({estado_pedido:'Entregado'}).eq('id', idV);
                                    }
                                    alert("✅ Entrega confirmada."); await cargarTodoDesdeNube();
                                }
                            }} style={{ width: '100%', backgroundColor: OSCURO_BJ, color: '#fff', border: 'none', padding: '15px', borderRadius: '15px', fontWeight: '900', cursor:'pointer' }}>MARCAR COMO ENTREGADO ✅</button>
                        </div>
                    ))}
                    {logisticaInteligente.almacen.length === 0 && <p style={{textAlign:'center', opacity:0.5, gridColumn:'1/-1'}}>No hay entregas pendientes.</p>}
                </div>
            </div>

            <div style={{ ...sCrd_BJ, borderLeft: `15px solid ${AMARILLO_BJ}` }}>
                <h3 style={{ margin: 0, fontSize: '1.6rem', fontWeight: '900', color: AMARILLO_BJ, marginBottom:'25px' }}>💸 Cuentas Deudoras (Ventas a Crédito)</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
                    {logisticaInteligente.deudas.map((grupo, idx) => (
                        <div key={idx} style={{ padding: '25px', backgroundColor: '#FFFBEB', borderRadius: '25px', border:`2px solid ${AMARILLO_BJ}40` }}>
                            <div style={{display:'flex', justifyContent:'space-between', marginBottom:'15px'}}>
                                <div><strong>{grupo.cliente}</strong><br/><small>{grupo.localidad}</small></div>
                                <h4 style={{color:AMARILLO_BJ, margin:0}}>DEUDA: S/ {grupo.total.toFixed(2)}</h4>
                            </div>
                            
                            {/* DETALLE DE DEUDA */}
                            <div style={{ background: '#fff', padding: '12px', borderRadius: '15px', marginBottom: '15px', border: '1px solid #FEF3C7' }}>
                                {grupo.items.map((it, i) => (
                                    <div key={i} style={{ fontSize: '13px' }}>• {it.cantidad}x {it.nombre} ({it.color})</div>
                                ))}
                            </div>

                            <button onClick={() => handleCobrarDeudaBJ(grupo)} style={{ width: '100%', backgroundColor: VERDE_BJ, color: '#fff', border: 'none', padding: '18px', borderRadius: '15px', fontWeight: '900', cursor:'pointer' }}>💰 REGISTRAR PAGO TOTAL</button>
                        </div>
                    ))}
                    {logisticaInteligente.deudas.length === 0 && <p style={{textAlign:'center', opacity:0.5, gridColumn:'1/-1'}}>No hay deudas pendientes.</p>}
                </div>
            </div>
          </div>
        )}

        {/* ===================== [ZONA: VISTA GESTIÓN] ===================== */}
        {vista === 'contabilidad' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '45px' }}>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '30px' }}>
                <div style={sCrd_BJ}>
                    <h4 style={{margin:0, color:FUCSIA_PRINCIPAL, fontSize:'14px', fontWeight:'900', marginBottom:'15px'}}>🏁 PUNTO DE EQUILIBRIO (UTILIDAD REAL VENTAS)</h4>
                    <div style={{height:'20px', width:'100%', backgroundColor:'#F1F5F9', borderRadius:'10px', overflow:'hidden', marginBottom:'15px', border:'1px solid #eee'}}>
                        <div style={{height:'100%', width:`${balanceEliteBJ.pe_p}%`, backgroundColor:VERDE_BJ, transition:'1s'}}></div>
                    </div>
                    <div style={{display:'flex', justifyContent:'space-between', fontSize:'13px'}}>
                        <span>Utilidad Mes: S/ {balanceEliteBJ.pe_g.toFixed(2)}</span>
                        <strong>Meta Gasto: S/ {balanceEliteBJ.pe_m.toFixed(2)}</strong>
                    </div>
                </div>

                <div style={{ ...sCrd_BJ, backgroundColor: OSCURO_BJ, color: '#fff', border:`4px solid ${FUCSIA_PRINCIPAL}` }}>
                    <h4 style={{margin:0, color:FUCSIA_PRINCIPAL, fontSize:'14px', fontWeight:'900', marginBottom:'15px'}}>💰 BÓVEDA: DISPONIBLE PARA RETIRO (GANANCIA NETA)</h4>
                    <h3 style={{fontSize:'3.2rem', margin:0, color:'#fff'}}>S/ {balanceEliteBJ.bR.toFixed(2)}</h3>
                    <small style={{opacity:0.6}}>Ganancia neta acumulada histórica menos tus retiros personales registrados.</small>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '25px' }}>
                <div style={{ ...sCrd_BJ, borderLeft:`10px solid #64748B` }}>
                    <small style={{fontWeight:'900', opacity:0.6}}>CAPITAL EN ALMACÉN (COSTO PRODUCTOS)</small>
                    <h4 style={{fontSize:'2.2rem', margin:'10px 0'}}>S/ {valStock.cost.toLocaleString('es-PE')}</h4>
                </div>
                <div style={{ ...sCrd_BJ, borderLeft:`10px solid ${AMARILLO_BJ}` }}>
                    <small style={{fontWeight:'900', opacity:0.6}}>CAJA TOTAL ACTUAL (DINERO EN MANO)</small>
                    <h4 style={{fontSize:'2.2rem', margin:'10px 0'}}>S/ {balanceEliteBJ.cG.toFixed(2)}</h4>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '45px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '45px' }}>
                <div style={sCrd_BJ}>
                  <h4 style={{ marginTop: 0, marginBottom: '25px', fontWeight: '900', fontSize:'1.2rem' }}>💸 Registrar Movimiento de Caja Detallado</h4>
                  <form onSubmit={handleRegistrarFinanzaBJ} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'15px'}}>
                        <select value={formFinanzas.tipo} onChange={e => setFormFinanzas({...formFinanzas, tipo: e.target.value})} style={sInp_BJ}>
                            <option value="Gasto Local">🏪 Gasto Local</option>
                            <option value="Inversión (Mercadería)">📦 Inversión (Mercadería)</option>
                            <option value="Retiro Personal">🏧 Retiro Personal</option>
                            <option value="Ingreso Adicional">💰 Inyección Capital</option>
                        </select>
                        <select value={formFinanzas.origen} onChange={e => setFormFinanzas({...formFinanzas, origen: e.target.value})} style={{...sInp_BJ, border:`2px solid ${AMARILLO_BJ}`}}>
                            <option value="Caja Global">De: Caja Global</option>
                            <option value="Ganancias">De: Ganancias del Negocio</option>
                        </select>
                    </div>
                    <input placeholder="Descripción del movimiento..." value={formFinanzas.descripcion} onChange={e => setFormFinanzas({...formFinanzas, descripcion: e.target.value})} style={sInp_BJ} />
                    <input type="text" placeholder="Monto S/" value={formFinanzas.monto} onChange={e => setFormFinanzas({...formFinanzas, monto: handleInputMonto(e.target.value)})} style={sInp_BJ} />
                    <button type="submit" style={{ backgroundColor: FUCSIA_PRINCIPAL, color: '#fff', border: 'none', padding: '18px', borderRadius: '18px', fontWeight: '900', cursor:'pointer' }}>GUARDAR REGISTRO</button>
                  </form>
                </div>
                <div style={{ ...sCrd_BJ, border: `3px solid ${FUCSIA_PRINCIPAL}` }}>
                  <h4 style={{ marginTop: 0, marginBottom: '25px', fontWeight: '900', fontSize:'1.2rem' }}>🆕 Subir Nuevo Producto al Catálogo</h4>
                  <form onSubmit={handleAddProductoBJ} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <input placeholder="Nombre Modelo" value={formProd.nombre} onChange={e => setFormProd({...formProd, nombre: e.target.value})} style={sInp_BJ} />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                        <input type="text" placeholder="Costo Compra" value={formProd.precio_compra} onChange={e => setFormProd({...formProd, precio_compra: handleInputMonto(e.target.value)})} style={sInp_BJ} />
                        <input type="number" placeholder="Stock Inicial" value={formProd.stock} onChange={e => setFormProd({...formProd, stock: e.target.value})} style={sInp_BJ} />
                    </div>
                    <button type="submit" style={{ backgroundColor: OSCURO_BJ, color: '#fff', border: 'none', padding: '18px', borderRadius: '18px', fontWeight: '900', cursor:'pointer' }}>CREAR PRODUCTO</button>
                  </form>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
                <div style={sCrd_BJ}>
                  <h4 style={{ marginTop: 0, marginBottom: '25px', fontWeight: '900', fontSize:'1.2rem' }}>🏆 PRODUCTOS MÁS RENTABLES</h4>
                  {seriesRankingBJ.map((p, i) => (
                    <div key={i} style={{display:'flex', justifyContent:'space-between', padding:'12px 0', borderBottom:'1px solid #f1f1f1'}}>
                        <span>{i+1}. {p[0]}</span>
                        <strong style={{color:VERDE_BJ}}>+ S/ {p[1].toFixed(2)}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={sCrd_BJ}>
                <h4 style={{ marginTop: 0, marginBottom: '30px', fontWeight: '900', fontSize: '1.4rem' }}>📖 Libro Diario de Operaciones BJ</h4>
                <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                    <table style={{ width: '100%', fontSize: '14px', borderCollapse: 'collapse' }}>
                        <tbody>
                        {finanzas.map(f => (
                            <tr key={f.id} style={{ borderBottom: '1px solid #f1f1f1' }}>
                            <td style={{ padding: '20px 10px' }}>
                                <small style={{fontWeight:'900', color:'#64748B', display:'block'}}>{getFechaPeru(f.created_at)} | {getHoraPeru(f.created_at)}</small>
                                <small style={{fontWeight:'900', color:FUCSIA_PRINCIPAL, textTransform:'uppercase'}}>{f.tipo}</small>
                                <br/><span style={{ fontWeight: '600', fontSize:'15px' }}>{f.descripcion}</span>
                                <br/><small style={{color: AMARILLO_BJ, fontWeight:'900'}}>Bolsa: {f.origen || 'Caja Global'}</small>
                            </td>
                            <td style={{ textAlign: 'right', padding: '20px 10px', fontWeight: '900', fontSize: '18px', color: (f.tipo.includes('Ingreso')) ? VERDE_BJ : OSCURO_BJ }}>S/ {(Number(f.monto) || 0).toFixed(2)}</td>
                            <td style={{ textAlign: 'right', padding: '20px 10px' }}>
                                <button onClick={async ()=> { if(confirm("¿Borrar movimiento definitivamente?")) { await supabase.from('finanzas').delete().eq('id', f.id); await cargarTodoDesdeNube(); } }} style={{background:'none', border:'none', color: FUCSIA_PRINCIPAL, cursor:'pointer', fontSize: '1.5rem'}}>🗑️</button>
                            </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div style={sCrd_BJ}>
                <h4 style={{ marginTop: 0, color: FUCSIA_PRINCIPAL, marginBottom: '35px', fontWeight: '900', fontSize: '1.4rem' }}>📈 ROI / Retorno de Inversión Almacén</h4>
                <div style={{ height: '400px', width: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartROIConfigBJ} margin={{ top: 25, right: 30, left: -5, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                            <XAxis dataKey="n" fontSize={13} fontWeight="900" axisLine={false} tickLine={false} dy={15} />
                            <YAxis fontSize={13} axisLine={false} tickLine={false} />
                            <Tooltip contentStyle={{ borderRadius: '25px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.15)', fontWeight: '900' }} />
                            <Bar dataKey="v" radius={[20, 20, 0, 0]} barSize={90}>
                                {chartROIConfigBJ.map((entry, index) => ( <Cell key={`cell-${index}`} fill={entry.fill} /> ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}