"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from './supabaseClient';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid, Cell 
} from 'recharts';

/**
 * ============================================================
 * SISTEMA BJ IMPORTACIONES CHICLAYO - CONTROL EMPRESARIAL PRO
 * VERSION: 66.0 - BUNKER INMUNE (TOTALMENTE EXPANDIDO)
 * ESTADO: VERIFICACIÓN DE FUNCIONES Y BLINDAJE DE GESTIÓN
 * ============================================================
 */

export default function SistemaBJCMasterFinal() {
  
  // ============================================================
  // [BLOQUE 1] HELPERS DE SEGURIDAD (PROTOCOLO ANTICRASH)
  // ============================================================

  // getFechaPeru: Garantiza que el sistema no explote si Supabase envía una fecha nula.
  const getFechaPeru = (dateInput) => {
    try {
        const fechaParaValidar = dateInput ? new Date(dateInput) : new Date();
        if (isNaN(fechaParaValidar.getTime())) {
            const fallback = new Date();
            return fallback.toISOString().split('T')[0];
        }
        const configPeru = { timeZone: "America/Lima", year: 'numeric', month: '2-digit', day: '2-digit' };
        const formateador = new Intl.DateTimeFormat('en-CA', configPeru);
        const partes = formateador.formatToParts(fechaParaValidar);
        const anio = partes.find(p => p.type === 'year')?.value || "2026";
        const mes = partes.find(p => p.type === 'month')?.value || "01";
        const dia = partes.find(p => p.type === 'day')?.value || "01";
        return `${anio}-${mes}-${dia}`;
    } catch (e) { 
        return new Date().toISOString().split('T')[0]; 
    }
  };

  // getHoraPeru: Formato 12H (AM/PM) para tickets y control de caja.
  const getHoraPeru = (dateInput) => {
    if (!dateInput) return "--:--";
    try {
        const dHora = new Date(dateInput);
        if (isNaN(dHora.getTime())) return "--:--";
        const opcionesH = { timeZone: "America/Lima", hour: '2-digit', minute: '2-digit', hour12: true };
        return dHora.toLocaleTimeString('es-PE', opcionesH);
    } catch (e) { return "--:--"; }
  };

  // handleInputMonto: Limpia inputs para evitar errores en cálculos matemáticos.
  const handleInputMonto = (v) => {
    if (v === undefined || v === null) return "";
    const texto = String(v);
    return texto.replace(',', '.').replace(/[^0-9.]/g, '');
  };

  // getEtiquetaProducto: Badge visual para el catálogo de productos.
  const getEtiquetaProducto = (fechaC) => {
    if (!fechaC) return null;
    try {
        const diff = Math.floor((new Date() - new Date(fechaC)) / (1000 * 60 * 60 * 24));
        if (diff <= 3) return { tipo: 'NUEVO', icono: '✨', color: '#F01097' };
        if (diff <= 8) return { tipo: 'RECIENTE', icono: '📦', color: '#A13C6D' };
        return null;
    } catch (e) { return null; }
  };

  // ============================================================
  // [BLOQUE 2] ALMACÉN DE ESTADOS (REACT STATE)
  // ============================================================

  // Datos principales
  const [productos, setProductos] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [finanzas, setFinanzas] = useState([]);
  
  // Control de UI y Carga
  const [vista, setVista] = useState('ventas'); 
  const [cargando, setCargando] = useState(true);
  
  // Filtros
  const [busqueda, setBusqueda] = useState(''); 
  const [busquedaStock, setBusquedaStock] = useState(''); 
  const [fechaConsulta, setFechaConsulta] = useState(getFechaPeru());
  
  // Formulario Venta
  const [cliente, setCliente] = useState('');
  const [localidad, setLocalidad] = useState(''); 
  const [telefono, setTelefono] = useState(''); 
  const [tipoVenta, setTipoVenta] = useState('Mayor'); 
  const [cantidades, setCantidades] = useState({});
  const [coloresElegidos, setColoresElegidos] = useState({});
  const [carrito, setCarrito] = useState([]);
  const [descuento, setDescuento] = useState(0); 

  // Edición
  const [editandoGrupoId, setEditandoGrupoId] = useState(null); 
  const [formEditCliente, setFormEditCliente] = useState({ nombre: '', localidad: '', telefono: '' });
  const [idItemVentaEditando, setIdItemVentaEditando] = useState(null); 
  const [nuevaCantVenta, setNuevaCantVenta] = useState(0);
  
  // Gestión
  const [idFinanzaEditando, setIdFinanzaEditando] = useState(null);
  const [formEditFinanza, setFormEditFinanza] = useState({ tipo: '', descripcion: '', monto: '', origen: 'Caja Global' });
  const [formProd, setFormProd] = useState({ nombre: '', precio_compra: '', precio_venta: '', precio_menor: '', stock: '', colores: '' });
  const [formFinanzas, setFormFinanzas] = useState({ tipo: 'Gasto Local', descripcion: '', monto: '', origen: 'Caja Global' });
  const [formEditStock, setFormEditStock] = useState({}); 

  // Paleta de Colores BJ Chiclayo
  const FUCSIA_BJ = '#F01097';
  const VERDE_BJ = '#16A34A';
  const ROJO_BJ = '#E11D48';
  const AMARILLO_BJ = '#CA8A04';
  const OSCURO_BJ = '#1E1B1C';

  // ============================================================
  // [BLOQUE 3] CONEXIÓN SUPABASE (REALTIME)
  // ============================================================

  useEffect(() => {
    const initApp = async () => {
        await cargarBaseDeDatos();
        setCargando(false);
    };
    initApp();

    const chV = supabase.channel('v66v').on('postgres_changes',{event:'*',schema:'public',table:'ventas'},()=>cargarBaseDeDatos()).subscribe();
    const chP = supabase.channel('v66p').on('postgres_changes',{event:'*',schema:'public',table:'productos'},()=>cargarBaseDeDatos()).subscribe();
    const chF = supabase.channel('v66f').on('postgres_changes',{event:'*',schema:'public',table:'finanzas'},()=>cargarBaseDeDatos()).subscribe();

    return () => { supabase.removeChannel(chV); supabase.removeChannel(chP); supabase.removeChannel(chF); };
  }, []);

  const cargarBaseDeDatos = async () => {
    try {
        const { data: p } = await supabase.from('productos').select('*').order('created_at', { ascending: false });
        const { data: v } = await supabase.from('ventas').select('*').order('created_at', { ascending: true });
        const { data: f } = await supabase.from('finanzas').select('*').order('created_at', { ascending: false });
        if (p) setProductos(p); if (v) setVentas(v); if (f) setFinanzas(f);
    } catch (e) { console.error("Error Sync:", e); }
  };

  // ============================================================
  // [BLOQUE 4] LÓGICA ESTRATÉGICA (MEMOS ANALÍTICOS)
  // ============================================================

  const logisticaInteligente = useMemo(() => {
    const contenedor = { almacen: [], cuentasPorCobrar: [] };
    if (!ventas.length) return contenedor;
    try {
        const gA = {}; const gC = {};
        ventas.forEach(v => {
            if (!v || !v.cliente_nombre) return;
            const key = `${v.cliente_nombre}-${v.localidad || 'SN'}`;
            if (v.estado_pedido === 'En Almacén') {
                if (!gA[key]) gA[key] = { cliente: v.cliente_nombre, localidad: v.localidad, telefono: v.telefono, items: [], total: 0 };
                gA[key].items.push(v); gA[key].total += (Number(v.precio_venta_unitario || 0) * Number(v.cantidad || 0));
            }
            if (v.estado_pedido === 'Pendiente de Pago') {
                if (!gC[key]) gC[key] = { cliente: v.cliente_nombre, localidad: v.localidad, telefono: v.telefono, items: [], total: 0 };
                gC[key].items.push(v); gC[key].total += (Number(v.precio_venta_unitario || 0) * Number(v.cantidad || 0));
            }
        });
        contenedor.almacen = Object.values(gA); contenedor.cuentasPorCobrar = Object.values(gC);
        return contenedor;
    } catch (e) { return contenedor; }
  }, [ventas]);

  const historialVentasDiaBJ = useMemo(() => {
    if (!ventas.length) return [];
    try {
        const filtradas = ventas.filter(v => v && getFechaPeru(v.created_at) === fechaConsulta);
        const grupos = {};
        filtradas.forEach(v => {
            const h = v.created_at ? v.created_at.substring(0,16) : "0000";
            const id = `${v.cliente_nombre || 'S'}-${v.localidad || 'Z'}-${h}`; 
            if (!grupos[id]) grupos[id] = { id_grupo: id, cliente_nombre: v.cliente_nombre, localidad: v.localidad, telefono: v.telefono, hora: getHoraPeru(v.created_at), total: 0, items: [] };
            grupos[id].items.push(v); grupos[id].total += (Number(v.precio_venta_unitario ?? 0) * Number(v.cantidad ?? 0));
        });
        return Object.values(grupos).reverse();
    } catch (e) { return []; }
  }, [ventas, fechaConsulta]);

  const balanceBunkerElite = useMemo(() => {
    const safe = { cH: 0, gH: 0, cG: 0, bR: 0, pe_prog: 0, pe_gan: 0, pe_meta: 0 };
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
            pe_prog: eM > 0 ? (gM / eM) * 100 : (gM > 0 ? 100 : 0),
            pe_gan: gM, pe_meta: eM
        };
    } catch (e) { return safe; }
  }, [finanzas, ventas]);

  const analyticsBJMaster = useMemo(() => {
    try {
        const dict = {};
        ventas.forEach(v => { const p = productos.find(x => x.id === v.producto_id); const n = p ? p.nombre : "Eliminado"; dict[n] = (dict[n] || 0) + Number(v.ganancia_total || 0); });
        const ranking = Object.entries(dict).sort((a,b) => b[1] - a[1]).slice(0, 5);
        const dormidos = productos.filter(p => { const hV = ventas.filter(v => v && v.producto_id === p.id); const uV = hV.pop(); if (!uV) return true; const dF = Math.floor((new Date() - new Date(uV.created_at)) / (1000 * 60 * 60 * 24)); return dF > 20 && p.stock > 0; }).slice(0, 5);
        return { ranking, dormidos };
    } catch (e) { return { ranking: [], dormidos: [] }; }
  }, [ventas, productos]);

  const valInvTotal = useMemo(() => {
    let c = 0; let v = 0;
    productos.forEach(p => { if (p && Number(p.stock) > 0) { c += (Number(p.precio_compra || 0) * p.stock); v += (Number(p.precio_venta || 0) * p.stock); } });
    return { cost: c, vent: v };
  }, [productos]);

  // ============================================================
  // [BLOQUE 5] FUNCIONES DE ACCIÓN (BLINDADAS v66)
  // ============================================================

  // AUTOCOMPLETADO
  const handleSeleccionarClienteAuto = (e) => {
    const val = e.target.value; setCliente(val);
    const m = (ventas || []).find(v => v && v.cliente_nombre?.toLowerCase() === val.toLowerCase());
    if (m) { setLocalidad(m.localidad || ''); setTelefono(m.telefono || ''); }
  };

  // REGISTRO DE VENTA
  const handleEjecutarVentaFinal = async (est) => {
    if (!cliente || !localidad || !carrito.length) return alert("Faltan datos.");
    const tV = carrito.reduce((acc, i) => acc + (Number(i.precio_venta) * i.cantidad), 0);
    const rD = tV > 0 ? (Number(descuento) / tV) : 0;
    const inserts = carrito.map(i => ({ 
        cliente_nombre: cliente, localidad, telefono, 
        producto_id: i.producto_id, cantidad: i.cantidad, color: i.color, 
        precio_venta_unitario: Number(i.precio_venta), 
        precio_costo_unitario: Number(i.precio_compra || 0), 
        ganancia_total: ((Number(i.precio_venta) - Number(i.precio_compra || 0)) * i.cantidad) - ((Number(i.precio_venta) * i.cantidad) * rD), 
        estado_pedido: est 
    }));
    const { error } = await supabase.from('ventas').insert(inserts);
    if (!error) {
      for (const item of carrito) {
        const pO = productos.find(p => p.id === item.producto_id);
        if (pO) await supabase.from('productos').update({ stock: pO.stock - item.cantidad }).eq('id', item.producto_id);
      }
      setCliente(''); setLocalidad(''); setTelefono(''); setCarrito([]); setDescuento(0); alert("✅ Guardado.");
    }
  };

  // REGISTRO DE PRODUCTOS (LA QUE DABA ERROR)
  const handleAddProductoBJ = async (e) => {
    e.preventDefault();
    if (!formProd.nombre) return alert("Nombre obligatorio.");
    const { error } = await supabase.from('productos').insert([{
        nombre: formProd.nombre, 
        precio_compra: Number(handleInputMonto(formProd.precio_compra)),
        precio_venta: Number(handleInputMonto(formProd.precio_venta)), 
        precio_menor: Number(handleInputMonto(formProd.precio_menor)),
        stock: Number(formProd.stock), 
        colores: formProd.colores
    }]);
    if (!error) {
        setFormProd({ nombre: '', precio_compra: '', precio_venta: '', precio_menor: '', stock: '', colores: '' });
        alert("✨ Creado correctamente.");
    }
  };

  // REGISTRO DE FINANZAS
  const handleRegistrarFinanzaMaster = async (e) => {
    e.preventDefault();
    const clM = handleInputMonto(formFinanzas.monto);
    await supabase.from('finanzas').insert([{ 
        tipo: formFinanzas.tipo, 
        descripcion: formFinanzas.descripcion, 
        monto: Number(clM), 
        origen: formFinanzas.origen 
    }]);
    setFormFinanzas({tipo:'Gasto Local', descripcion:'', monto:'', origen: 'Caja Global'}); alert("✅ Guardado.");
  };

  // EXPORTACIÓN EXCEL
  const handleExportarExcelCajaFull = () => {
    let csv = "REPORTE AUDITORIA BJ IMPORTACIONES\n";
    csv += `CAJA GLOBAL,S/ ${balanceBunkerElite.cG.toFixed(2)}\n`;
    csv += `BOVEDA GANANCIAS,S/ ${balanceBunkerElite.bR.toFixed(2)}\n\n`;
    csv += "Hora,Cliente,Zona,Producto,Cant,Precio,Total\n";
    ventas.filter(v => getFechaPeru(v.created_at) === fechaConsulta).forEach(v => {
      const nP = productos.find(p=>p.id===v.producto_id)?.nombre || "Item";
      csv += `${getHoraPeru(v.created_at)},${v.cliente_nombre},${v.localidad},${nP},${v.cantidad},${v.precio_venta_unitario},${(v.precio_venta_unitario*v.cantidad).toFixed(2)}\n`;
    });
    const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    link.download = `AUDITORIA_BJ_${fechaConsulta}.csv`; link.click();
  };

  // ANULACIÓN
  const handleAnularVentaCompleta = async (v) => {
    if (confirm("¿Anular?")) {
      const pc = productos.find(pr => pr.id === v.producto_id);
      if (pc) await supabase.from('productos').update({ stock: pc.stock + v.cantidad }).eq('id', pc.id);
      await supabase.from('ventas').delete().eq('id', v.id);
    }
  };

  // ============================================================
  // [BLOQUE 6] INTERFAZ (JSX EXPANDIDO)
  // ============================================================

  const sInp = { padding: '16px', borderRadius: '16px', border: `2px solid #FCC2E2`, width: '100%', outline: 'none', fontSize: '15px', boxSizing: 'border-box', backgroundColor: '#fff' };
  const sCrd = { backgroundColor: '#ffffff', borderRadius: '35px', padding: '35px', boxShadow: `0 20px 40px rgba(247, 134, 193, 0.1)`, border: '1px solid #FFF1F2' };

  if (cargando) return <div style={{ height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', backgroundColor:'#FFF5F7', color:FUCSIA_BJ, fontWeight:'900', fontSize:'1.5rem' }}>INICIANDO BUNKER BJ v66... 🚀💎</div>;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FFF5F7', color: OSCURO_BJ, fontFamily: 'system-ui, sans-serif' }}>
      
      {/* 🚀 NAVBAR */}
      <header style={{ backgroundColor: '#ffffff', padding: '15px 5%', position: 'sticky', top: 0, zIndex: 100, display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: `0 4px 15px rgba(0,0,0,0.06)` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ backgroundColor: FUCSIA_BJ, color: '#fff', width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900' }}>BJ</div>
          <h1 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '900', color: FUCSIA_BJ }}>MAESTRO v66</h1>
        </div>
        <nav style={{ display: 'flex', gap: '8px', backgroundColor: `#FCA5D415`, padding: '5px', borderRadius: '15px' }}>
          <button onClick={() => setVista('ventas')} style={{ backgroundColor: vista === 'ventas' ? FUCSIA_BJ : 'transparent', border: 'none', color: vista === 'ventas' ? '#fff' : FUCSIA_BJ, padding: '10px 18px', borderRadius: '10px', cursor: 'pointer', fontWeight: '900' }}>VENTAS</button>
          <button onClick={() => setVista('logistica')} style={{ backgroundColor: vista === 'logistica' ? OSCURO_BJ : 'transparent', border: 'none', color: vista === 'logistica' ? '#fff' : OSCURO_BJ, padding: '10px 18px', borderRadius: '10px', cursor: 'pointer', fontWeight: '900' }}>LOGÍSTICA</button>
          <button onClick={() => setVista('contabilidad')} style={{ backgroundColor: vista === 'contabilidad' ? FUCSIA_BJ : 'transparent', border: 'none', color: vista === 'contabilidad' ? '#fff' : FUCSIA_BJ, padding: '10px 18px', borderRadius: '10px', cursor: 'pointer', fontWeight: '900' }}>GESTIÓN</button>
        </nav>
      </header>

      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '30px 20px' }}>
        
        {/* ===================== VISTA VENTAS ===================== */}
        {vista === 'ventas' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '35px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '25px' }}>
              <div style={sCrd}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: FUCSIA_BJ, fontWeight: '900', fontSize: '13px' }}>💰 EFECTIVO HOY</span>
                    <button onClick={handleExportarExcelCajaFull} style={{ background:`${FUCSIA_BJ}20`, border:'none', padding:'8px 15px', borderRadius:'10px', color:FUCSIA_BJ, fontWeight:'900', fontSize:'10px', cursor:'pointer' }}>EXCEL AUDITOR</button>
                </div>
                <h2 style={{ margin: '15px 0', fontSize: '3.2rem', fontWeight: '900' }}>S/ {balanceBunkerElite.cH.toFixed(2)}</h2>
                <div style={{ color: VERDE_BJ, fontWeight: '900' }}>Ganancia: S/ {balanceBunkerElite.gH.toFixed(2)}</div>
              </div>
              <div style={sCrd}>
                <span style={{ color: FUCSIA_BJ, fontWeight: '900', fontSize: '13px' }}>📅 FILTRAR FECHA</span>
                <input type="date" value={fechaConsulta} onChange={e => setFechaConsulta(e.target.value)} style={{ ...sInp, marginTop: '15px' }} />
              </div>
            </div>

            <div style={{ ...sCrd, border: `3px solid #FCA5D4` }}>
              <h3 style={{ margin: 0, color: FUCSIA_BJ, marginBottom:'25px' }}>🛒 Nueva Operación</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px', marginBottom: '30px' }}>
                <input list="cli" placeholder="Cliente" value={cliente} onChange={handleSeleccionarClienteAuto} style={sInp} />
                <datalist id="cli">{[...new Set(ventas.map(v => v.cliente_nombre))].map((c, i) => <option key={i} value={c} />)}</datalist>
                <input placeholder="Zona" value={localidad} onChange={e => setLocalidad(e.target.value)} style={sInp} />
              </div>

              {carrito.length > 0 && (
                <div style={{ backgroundColor: '#FFF9FB', border: `2px dashed ${FUCSIA_BJ}`, borderRadius: '25px', padding: '25px', marginBottom: '30px' }}>
                  {carrito.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #FCC2E2', paddingBottom: '10px', marginBottom: '10px' }}>
                      <div style={{ flex: 1 }}><strong>{item.cantidad}x</strong> {item.nombre} <br/><small>{item.color}</small></div>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <input value={item.precio_venta} onChange={(e) => { const n = [...carrito]; n[idx].precio_venta = handleInputMonto(e.target.value); setCarrito(n); }} style={{ width: '70px', borderRadius: '8px', border: '1px solid #FCA5D4', textAlign: 'center', fontWeight: '900' }} />
                        <button onClick={() => { const n = [...carrito]; n.splice(idx, 1); setCarrito(n); }} style={{ color: '#fff', backgroundColor: FUCSIA_BJ, border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer' }}>X</button>
                      </div>
                    </div>
                  ))}
                  <div style={{ textAlign: 'right', marginTop: '20px' }}>
                    <h3 style={{ margin: '10px 0', fontSize: '2.5rem' }}>Total: S/ {(carrito.reduce((acc, i) => acc + (Number(i.precio_venta) * i.cantidad), 0) - Number(descuento)).toFixed(2)}</h3>
                    <div style={{ display: 'flex', gap: '15px', justifyContent: 'flex-end' }}>
                        <button onClick={() => handleEjecutarVentaFinal('Entregado')} style={{ backgroundColor: OSCURO_BJ, color: '#fff', border: 'none', padding: '15px 25px', borderRadius: '15px', fontWeight: '900', cursor: 'pointer' }}>ENTREGAR ✅</button>
                        <button onClick={() => handleEjecutarVentaFinal('Pendiente de Pago')} style={{ backgroundColor: AMARILLO_BJ, color: '#fff', border: 'none', padding: '15px 25px', borderRadius: '15px', fontWeight: '900', cursor: 'pointer' }}>A PAGAR 💸</button>
                    </div>
                  </div>
                </div>
              )}

              <input placeholder="🔍 Buscar modelo..." value={busqueda} onChange={e => setBusqueda(e.target.value)} style={{ ...sInp, marginBottom: '20px' }} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px', maxHeight: '600px', overflowY: 'auto' }}>
                {productos.filter(p => p.nombre?.toLowerCase().includes(busqueda.toLowerCase())).map((p) => (
                  <div key={p.id} style={{ border: '1px solid #eee', padding: '20px', borderRadius: '25px', position: 'relative' }}>
                    {getEtiquetaProducto(p.created_at) && <span style={{ position:'absolute', top: '-10px', left: '15px', backgroundColor: getEtiquetaProducto(p.created_at).color, color: '#fff', fontSize: '10px', padding: '5px 12px', borderRadius: '10px' }}>{getEtiquetaProducto(p.created_at).tipo}</span>}
                    <strong style={{ display: 'block', height: '40px', overflow: 'hidden' }}>{p.nombre}</strong>
                    <div style={{ margin: '10px 0', color: Number(p.stock) < 5 ? ROJO_BJ : VERDE_BJ, fontWeight: '900' }}>STOCK: {p.stock}</div>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginBottom: '15px' }}>
                        <button onClick={() => setCantidades({...cantidades, [p.id]: Math.max(1, (cantidades[p.id] || 1) - 1)})} style={{ borderRadius: '8px', border: '1px solid #ddd', width: '35px' }}>-</button>
                        <span style={{ fontWeight: '900', fontSize: '1.2rem' }}>{cantidades[p.id] || 1}</span>
                        <button onClick={() => setCantidades({...cantidades, [p.id]: (cantidades[p.id] || 1) + 1})} style={{ borderRadius: '8px', border: '1px solid #ddd', width: '35px' }}>+</button>
                    </div>
                    <button onClick={() => handleAddAlCarritoElite(p)} disabled={p.stock <= 0} style={{ width: '100%', backgroundColor: FUCSIA_BJ, color: '#fff', border: 'none', padding: '12px', borderRadius: '12px', fontWeight: '900', cursor:'pointer' }}>VENDER</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ===================== VISTA GESTIÓN ===================== */}
        {vista === 'contabilidad' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                <div style={sCrd}>
                    <h4 style={{margin:0, color:FUCSIA_BJ, fontSize:'14px', fontWeight:'900', marginBottom:'15px'}}>🏁 PUNTO DE EQUILIBRIO</h4>
                    <div style={{height:'18px', width:'100%', backgroundColor:'#F1F5F9', borderRadius:'10px', overflow:'hidden', marginBottom:'15px'}}>
                        <div style={{height:'100%', width:`${balanceBunkerElite.pe_prog}%`, backgroundColor:VERDE_BJ, transition:'1s'}}></div>
                    </div>
                    <div style={{display:'flex', justifyContent:'space-between', fontSize:'13px'}}>
                        <span>Utilidad: S/ {balanceBunkerElite.pe_gan.toFixed(2)}</span>
                        <strong>Meta: S/ {balanceBunkerElite.pe_meta.toFixed(2)}</strong>
                    </div>
                </div>

                <div style={{ ...sCrd, backgroundColor: OSCURO_BJ, color: '#fff', border:`3px solid ${FUCSIA_BJ}` }}>
                    <h4 style={{margin:0, color:FUCSIA_BJ, fontSize:'14px', fontWeight:'900', marginBottom:'15px'}}>💰 BÓVEDA PARA RETIRO</h4>
                    <h3 style={{fontSize:'2.8rem', margin:0}}>S/ {balanceBunkerElite.bR.toFixed(2)}</h3>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px' }}>
                <div style={{ ...sCrd, borderLeft:`10px solid #64748B` }}>
                    <small style={{fontWeight:'900', opacity:0.6}}>CAPITAL EN ALMACÉN</small>
                    <h4 style={{fontSize:'1.8rem', margin:'10px 0'}}>S/ {valInvTotal.cost.toLocaleString('es-PE')}</h4>
                </div>
                <div style={{ ...sCrd, borderLeft:`10px solid ${AMARILLO_BJ}` }}>
                    <small style={{fontWeight:'900', opacity:0.6}}>CAJA TOTAL ACTUAL</small>
                    <h4 style={{fontSize:'1.8rem', margin:'10px 0'}}>S/ {balanceBunkerElite.cG.toFixed(2)}</h4>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
              <div style={sCrd}>
                  <h4 style={{ marginTop: 0, marginBottom: '20px' }}>💸 Registrar Movimiento</h4>
                  <form onSubmit={handleRegistrarFinanzaMaster} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <select value={formFinanzas.tipo} onChange={e => setFormFinanzas({...formFinanzas, tipo: e.target.value})} style={sInp}>
                        <option value="Gasto Local">🏪 Gasto Local</option>
                        <option value="Retiro Personal">🏧 Retiro Personal</option>
                        <option value="Ingreso Adicional">💰 Inyección Capital</option>
                    </select>
                    <select value={formFinanzas.origen} onChange={e => setFormFinanzas({...formFinanzas, origen: e.target.value})} style={sInp}>
                        <option value="Caja Global">De: Caja Global</option>
                        <option value="Ganancias">De: Ganancias</option>
                    </select>
                    <input placeholder="Descripción" value={formFinanzas.descripcion} onChange={e => setFormFinanzas({...formFinanzas, descripcion: e.target.value})} style={sInp} />
                    <input placeholder="Monto S/" value={formFinanzas.monto} onChange={e => setFormFinanzas({...formFinanzas, monto: handleInputMonto(e.target.value)})} style={sInp} />
                    <button type="submit" style={{ backgroundColor: FUCSIA_BJ, color: '#fff', border: 'none', padding: '15px', borderRadius: '15px', fontWeight: '900', cursor:'pointer' }}>GUARDAR</button>
                  </form>
              </div>

              <div style={sCrd}>
                  <h4 style={{ marginTop: 0, marginBottom: '20px' }}>🆕 Nuevo Producto</h4>
                  <form onSubmit={handleAddProductoBJ} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <input placeholder="Modelo" value={formProd.nombre} onChange={e => setFormProd({...formProd, nombre: e.target.value})} style={sInp} />
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
                        <input placeholder="Costo" value={formProd.precio_compra} onChange={e => setFormProd({...formProd, precio_compra: handleInputMonto(e.target.value)})} style={sInp} />
                        <input placeholder="Venta" value={formProd.precio_venta} onChange={e => setFormProd({...formProd, precio_venta: handleInputMonto(e.target.value)})} style={sInp} />
                    </div>
                    <input placeholder="Stock" value={formProd.stock} onChange={e => setFormProd({...formProd, stock: e.target.value})} style={sInp} />
                    <button type="submit" style={{ backgroundColor: OSCURO_BJ, color: '#fff', border: 'none', padding: '15px', borderRadius: '15px', fontWeight: '900', cursor:'pointer' }}>CREAR PRODUCTO</button>
                  </form>
              </div>
            </div>

            <div style={sCrd}>
                <h4 style={{ marginTop: 0, color: FUCSIA_BJ, marginBottom: '25px' }}>📈 ROI / Retorno de Inversión</h4>
                <div style={{ height: '350px', width: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartROIStructure} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                            <XAxis dataKey="n" axisLine={false} tickLine={false} />
                            <YAxis axisLine={false} tickLine={false} />
                            <Tooltip contentStyle={{ borderRadius: '15px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }} />
                            <Bar dataKey="v" radius={[10, 10, 0, 0]} barSize={80}>
                                {chartROIStructure.map((entry, index) => ( <Cell key={index} fill={entry.fill} /> ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
          </div>
        )}

        {/* ===================== VISTA LOGÍSTICA ===================== */}
        {vista === 'logistica' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
             <div style={sCrd}>
                <h3 style={{ color: FUCSIA_BJ }}>📦 En Almacén</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                    {logisticaInteligente.almacen.map((g, i) => (
                        <div key={i} style={{ padding: '20px', border: '1px solid #f1f1f1', borderRadius: '20px' }}>
                            <strong>{g.cliente}</strong><br/><small>{g.localidad}</small>
                            <button onClick={async () => { if(confirm("¿Entregado?")) { for(let it of g.items) await supabase.from('ventas').update({estado_pedido:'Entregado'}).eq('id', it.id); } }} style={{ width: '100%', marginTop: '15px', background: OSCURO_BJ, color: '#fff', border: 'none', padding: '10px', borderRadius: '10px', cursor: 'pointer' }}>MARCAR ENTREGADO</button>
                        </div>
                    ))}
                </div>
             </div>
             <div style={{ ...sCrd, borderLeft: `10px solid ${AMARILLO_BJ}` }}>
                <h3 style={{ color: AMARILLO_BJ }}>💸 Cuentas por Cobrar</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                    {logisticaInteligente.cuentasPorCobrar.map((g, i) => (
                        <div key={i} style={{ padding: '20px', background: '#FFFBEB', borderRadius: '20px' }}>
                            <strong>{g.cliente}</strong> - <span style={{ fontWeight: '900' }}>S/ {g.total.toFixed(2)}</span>
                            <button onClick={() => handleCobrarDeudaBunker(g)} style={{ width: '100%', marginTop: '15px', background: VERDE_BJ, color: '#fff', border: 'none', padding: '10px', borderRadius: '10px', cursor: 'pointer' }}>REGISTRAR PAGO</button>
                        </div>
                    ))}
                </div>
             </div>
          </div>
        )}
      </main>
    </div>
  );
}

const chartROIStructure = [
    { n: 'Capital', fill: '#1E1B1C' },
    { n: 'Retorno', fill: '#F01097' }
];