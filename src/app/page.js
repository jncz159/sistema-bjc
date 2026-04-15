"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from './supabaseClient';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid, Cell 
} from 'recharts';

/**
 * ============================================================================
 * SISTEMA BJ IMPORTACIONES CHICLAYO - VERSION 79.0
 * ARCHIVO: page.js (ESTRUCTURA DE INGENIERÍA MAESTRA)
 * ESTADO: RESTAURACIÓN DE BALANCES + LOGÍSTICA DETALLADA
 * ============================================================================
 */

export default function SistemaBJCMasterFinal() {
  
  // ============================================================================
  // [BLOQUE: HELPERS Y SEGURIDAD]
  // Lógica de fechas, horas y limpieza de números.
  // ============================================================================

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

  // ============================================================================
  // [BLOQUE: ESTADOS DEL SISTEMA]
  // Almacenamiento de productos, ventas y finanzas.
  // ============================================================================

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

  const [formProd, setFormProd] = useState({ nombre: '', precio_compra: '', precio_venta: '', precio_menor: '', stock: '', colores: '' });
  const [formFinanzas, setFormFinanzas] = useState({ tipo: 'Gasto Local', descripcion: '', monto: '', origen: 'Caja Global' });

  const FUCSIA_PRINCIPAL = '#F01097';
  const VERDE_BJ = '#16A34A';
  const ROJO_BJ = '#E11D48';
  const AMARILLO_BJ = '#CA8A04';
  const OSCURO_BJ = '#1E1B1C';

  // ============================================================================
  // [BLOQUE: FUNCIONES DE ACCIÓN]
  // Registro de ventas, productos y movimientos de caja.
  // ============================================================================

  const handleAutocompleteCliente = (e) => {
    const valInput = e.target.value; setCliente(valInput);
    const mCli = (ventas || []).find(v => v && v.cliente_nombre?.toLowerCase() === valInput.toLowerCase());
    if (mCli) { setLocalidad(mCli.localidad || ''); setTelefono(mCli.telefono || ''); }
  };

  const handleEjecutarVentaBJ = async (estadoOperativo) => {
    if (!cliente || !localidad) return alert("Error: Cliente y Zona son obligatorios.");
    if (carrito.length === 0) return alert("Error: El carrito está vacío.");
    
    const totalVentaBase = carrito.reduce((acc, item) => acc + (Number(item.precio_venta) * item.cantidad), 0);
    const ratioDescuento = totalVentaBase > 0 ? (Number(descuento) / totalVentaBase) : 0;

    const listaV = carrito.map(item => {
        const precioVentaU = Number(item.precio_venta);
        const precioCostoU = Number(item.precio_compra || 0);
        const subtotalU = precioVentaU * item.cantidad;
        const gananciaReal = ((precioVentaU - precioCostoU) * item.cantidad) - (subtotalU * ratioDescuento);

        return { 
            cliente_nombre: cliente, localidad, telefono: telefono || '', producto_id: item.producto_id, 
            cantidad: item.cantidad, color: item.color, precio_venta_unitario: precioVentaU, 
            precio_costo_unitario: precioCostoU, ganancia_total: gananciaReal, estado_pedido: estadoOperativo 
        };
    });

    const { error } = await supabase.from('ventas').insert(listaV);
    if (!error) {
      for (const it of carrito) {
        const pO = productos.find(p => p.id === it.producto_id);
        if (pO) await supabase.from('productos').update({ stock: pO.stock - it.cantidad }).eq('id', it.producto_id);
      }
      setCliente(''); setLocalidad(''); setTelefono(''); setCarrito([]); setDescuento(0);
      alert("✅ Operación guardada."); await cargarTodoDesdeNube();
    } else { alert("Error al guardar venta."); }
  };

  const handleAddProductoBJ = async (e) => {
    if(e) e.preventDefault();
    if (!formProd.nombre) return alert("Nombre obligatorio.");
    const { error } = await supabase.from('productos').insert([{
        nombre: formProd.nombre, precio_compra: Number(handleInputMonto(formProd.precio_compra)),
        precio_venta: Number(handleInputMonto(formProd.precio_venta)), precio_menor: Number(handleInputMonto(formProd.precio_menor)),
        stock: Number(formProd.stock), colores: formProd.colores
    }]);
    if (!error) { setFormProd({ nombre: '', precio_compra: '', precio_venta: '', precio_menor: '', stock: '', colores: '' }); alert("✨ Modelo creado."); await cargarTodoDesdeNube(); }
  };

  const handleRegistrarFinanzaBJ = async (e) => {
    if(e) e.preventDefault();
    const cl_M = handleInputMonto(formFinanzas.monto);
    if (!cl_M) return alert("Ingresa un monto.");
    const { error } = await supabase.from('finanzas').insert([{ tipo: formFinanzas.tipo, descripcion: formFinanzas.descripcion, monto: Number(cl_M), origen: formFinanzas.origen }]);
    if (!error) { setFormFinanzas({tipo:'Gasto Local', descripcion:'', monto:'', origen: 'Caja Global'}); alert("✅ Registro guardado."); await cargarTodoDesdeNube(); }
  };

  const handleCobrarDeudaBJ = async (grupo) => {
    if(confirm(`¿Cobrar S/ ${grupo.total.toFixed(2)}?`)) {
        const ids = grupo.items_ids || [];
        for(let id of ids) await supabase.from('ventas').update({ estado_pedido: 'Entregado' }).eq('id', id);
        alert("💰 Pago recibido."); await cargarTodoDesdeNube();
    }
  };

  const handleAnularVentaBJ = async (v) => {
    if (confirm("¿Anular? Stock volverá al catálogo.")) {
      const pc = productos.find(pr => pr.id === v.producto_id);
      if (pc) await supabase.from('productos').update({ stock: pc.stock + v.cantidad }).eq('id', pc.id);
      await supabase.from('ventas').delete().eq('id', v.id);
      await cargarTodoDesdeNube();
    }
  };

  // ============================================================================
  // [BLOQUE: LÓGICA DE PROCESAMIENTO (useMemo)]
  // Cálculos de balances, valorización de stock y filtros de logística.
  // ============================================================================

  const logisticaInteligente = useMemo(() => {
    const res = { almacen: [], deudas: [] };
    if (!ventas.length) return res;
    try {
        const mA = {}; const mD = {};
        ventas.forEach(v => {
            if (!v || !v.cliente_nombre) return;
            const key = `${v.cliente_nombre}-${v.localidad || 'SN'}`;
            const pM = productos.find(p => p.id === v.producto_id);
            const itemDetalle = { id: v.id, nombre: pM ? pM.nombre : "Producto", cantidad: v.cantidad, color: v.color };

            if (v.estado_pedido === 'En Almacén') {
                if (!mA[key]) mA[key] = { cliente: v.cliente_nombre, localidad: v.localidad, telefono: v.telefono, items: [], total: 0, items_ids: [] };
                mA[key].items.push(itemDetalle); mA[key].items_ids.push(v.id);
                mA[key].total += (Number(v.precio_venta_unitario || 0) * Number(v.cantidad || 0));
            }
            if (v.estado_pedido === 'Pendiente de Pago') {
                if (!mD[key]) mD[key] = { cliente: v.cliente_nombre, localidad: v.localidad, telefono: v.telefono, items: [], total: 0, items_ids: [] };
                mD[key].items.push(itemDetalle); mD[key].items_ids.push(v.id);
                mD[key].total += (Number(v.precio_venta_unitario || 0) * Number(v.cantidad || 0));
            }
        });
        res.almacen = Object.values(mA); res.deudas = Object.values(mD);
        return res;
    } catch (e) { return res; }
  }, [ventas, productos]);

  const historialVentasDiaBJ = useMemo(() => {
    if (!Array.isArray(ventas) || ventas.length === 0) return [];
    try {
        const f = ventas.filter(v => v && getFechaPeru(v.created_at) === fechaConsulta);
        const g = {};
        f.forEach(v => {
            const h = v.created_at ? v.created_at.substring(0,16) : "0000";
            const id = `${v.cliente_nombre || 'SN'}-${v.localidad || 'SZ'}-${h}`; 
            if (!g[id]) g[id] = { id_grupo: id, cliente_nombre: v.cliente_nombre, localidad: v.localidad, telefono: v.telefono, hora: getHoraPeru(v.created_at), total: 0, items: [] };
            g[id].items.push(v); g[id].total += (Number(v.precio_venta_unitario ?? 0) * Number(v.cantidad ?? 0));
        });
        return Object.values(g).reverse();
    } catch (e) { return []; }
  }, [ventas, fechaConsulta]);

  const balanceEliteBJ = useMemo(() => {
    const s = { cH: 0, gH: 0, cG: 0, bR: 0, pe_p: 0, pe_g: 0, pe_m: 0 };
    if (!ventas.length || !finanzas.length) return s;
    try {
        const hoy = getFechaPeru();
        const mes = hoy.substring(0,7);
        const vH = ventas.filter(v => v && getFechaPeru(v.created_at) === hoy && v.estado_pedido !== 'Pendiente de Pago');
        const gAcum = ventas.reduce((acc, v) => acc + (Number(v?.ganancia_total) || 0), 0);
        const retG = finanzas.filter(f => f && f.origen === 'Ganancias').reduce((acc, f) => acc + (Number(f.monto) || 0), 0);
        const inS = ventas.filter(v => v && v.estado_pedido !== 'Pendiente de Pago').reduce((acc, v) => acc + (Number(v.precio_venta_unitario || 0) * Number(v.cantidad || 0)), 0);
        const inK = finanzas.filter(f => f && ['Ingreso Adicional','Inversión Inicial'].includes(f.tipo)).reduce((acc, f) => acc + (Number(f.monto) || 0), 0);
        const outG = finanzas.filter(f => f && ['Gasto Local','Inversión (Mercadería)','Retiro Personal'].includes(f.tipo)).reduce((acc, f) => acc + (Number(f.monto) || 0), 0);
        const meta = finanzas.filter(f => f && getFechaPeru(f.created_at).substring(0,7) === mes && ['Gasto Local','Retiro Personal'].includes(f.tipo)).reduce((acc, f) => acc + (Number(f.monto) || 0), 0);
        const util = ventas.filter(v => v && getFechaPeru(v.created_at).substring(0,7) === mes && v.estado_pedido !== 'Pendiente de Pago').reduce((acc, v) => acc + (Number(v.ganancia_total) || 0), 0);
        return { 
            cH: vH.reduce((acc, v) => acc + (Number(v.precio_venta_unitario ?? 0) * Number(v.cantidad ?? 0)), 0),
            gH: vH.reduce((acc, v) => acc + Number(v.ganancia_total || 0), 0),
            cG: (inS + inK - outG),
            bR: (gAcum - retG),
            pe_p: meta > 0 ? (util / meta) * 100 : (util > 0 ? 100 : 0),
            pe_g: util, pe_m: meta
        };
    } catch (e) { return s; }
  }, [finanzas, ventas]);

  const valorizacionInventarioTotal = useMemo(() => {
    let c = 0; let v = 0;
    productos.forEach(p => { if (p && Number(p.stock) > 0) { c += (Number(p.precio_compra || 0) * p.stock); v += (Number(p.precio_venta || 0) * p.stock); } });
    return { cost: c, vent: v };
  }, [productos]);

  const seriesRankingBJ = useMemo(() => {
    try {
        const d = {};
        ventas.forEach(v => { const pMatch = productos.find(x => x.id === v.producto_id); const n = pMatch ? pMatch.nombre : "Eliminado"; d[n] = (d[n] || 0) + Number(v.ganancia_total || 0); });
        return Object.entries(d).sort((a,b) => b[1] - a[1]).slice(0, 5);
    } catch (e) { return []; }
  }, [ventas, productos]);

  const seriesROIConfigBJ = [
    { n: 'Costo Almacén', v: valorizacionInventarioTotal.cost || 0, fill: OSCURO_BJ },
    { n: 'Venta Potencial', v: valorizacionInventarioTotal.vent || 0, fill: FUCSIA_PRINCIPAL }
  ];

  // ============================================================================
  // [BLOQUE: CARGA Y EXPORTACIÓN]
  // ============================================================================

  const cargarTodoDesdeNube = async () => {
    try {
        const { data: p } = await supabase.from('productos').select('*').order('created_at', { ascending: false });
        const { data: v } = await supabase.from('ventas').select('*').order('created_at', { ascending: true });
        const { data: f } = await supabase.from('finanzas').select('*').order('created_at', { ascending: false });
        if (p) setProductos(p); if (v) setVentas(v); if (f) setFinanzas(f);
    } catch (e) { console.error(e); }
    finally { setCargando(false); }
  };

  useEffect(() => {
    cargarTodoDesdeNube();
    const timer = setTimeout(() => setCargando(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  const handleExportarExcelCajaFull = () => {
    let csv = "AUDITORIA BJ IMPORTACIONES\n";
    csv += `SALDO CAJA GLOBAL,S/ ${balanceEliteBJ.cG.toFixed(2)}\n`;
    csv += `BOVEDA UTILIDADES,S/ ${balanceEliteBJ.bR.toFixed(2)}\n\n`;
    csv += "Hora,Cliente,Zona,Producto,Cant,Precio,Total\n";
    ventas.filter(v => getFechaPeru(v.created_at) === fechaConsulta).forEach(v => {
      const nP = productos.find(p=>p.id===v.producto_id)?.nombre || "Modelo";
      csv += `${getHoraPeru(v.created_at)},${v.cliente_nombre},${v.localidad},${nP},${v.cantidad},${v.precio_venta_unitario},${(v.precio_venta_unitario*v.cantidad).toFixed(2)}\n`;
    });
    const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    link.download = `BJ_AUDITORIA_${fechaConsulta}.csv`; link.click();
  };

  // ============================================================================
  // [BLOQUE: INTERFAZ DE USUARIO (JSX)]
  // ============================================================================

  const sInp = { padding: '16px', borderRadius: '16px', border: `2px solid #FCC2E2`, width: '100%', outline: 'none', fontSize: '15px', boxSizing: 'border-box', backgroundColor: '#fff' };
  const sCrd = { backgroundColor: '#ffffff', borderRadius: '35px', padding: '35px', boxShadow: `0 20px 40px rgba(247, 134, 193, 0.1)`, border: '1px solid #FFF1F2' };

  if (cargando) return (
    <div style={{ height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', backgroundColor:'#FFF5F7', color:FUCSIA_PRINCIPAL, fontWeight:'900', fontSize:'1.5rem' }}>
        INICIANDO BUNKER BJ ELITE v79... 🚀💎
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FFF5F7', color: OSCURO_BJ, fontFamily: 'system-ui, sans-serif' }}>
      
      {/* 🚀 NAVBAR PRINCIPAL FULL */}
      <header style={{ backgroundColor: '#ffffff', padding: '20px 5%', position: 'sticky', top: 0, zIndex: 100, display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: `0 4px 15px rgba(0,0,0,0.06)`, flexWrap: 'wrap', gap: '15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ backgroundColor: FUCSIA_PRINCIPAL, color: '#fff', width: '45px', height: '45px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '1.2rem' }}>BJ</div>
          <div><h1 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '900', color: FUCSIA_PRINCIPAL }}>BJ IMPORTACIONES</h1><small style={{ color: '#64748B', fontWeight: '900', fontSize: '10px' }}>v79 MASTER CHICLAYO</small></div>
        </div>
        <nav style={{ display: 'flex', gap: '10px', backgroundColor: `#FCA5D415`, padding: '6px', borderRadius: '18px' }}>
          <button onClick={() => setVista('ventas')} style={{ backgroundColor: vista === 'ventas' ? FUCSIA_PRINCIPAL : 'transparent', border: 'none', color: vista === 'ventas' ? '#fff' : FUCSIA_PRINCIPAL, padding: '12px 22px', borderRadius: '12px', cursor: 'pointer', fontWeight: '900' }}>VENTAS</button>
          <button onClick={() => setVista('logistica')} style={{ backgroundColor: vista === 'logistica' ? OSCURO_BJ : 'transparent', border: 'none', color: vista === 'logistica' ? '#fff' : OSCURO_BJ, padding: '12px 22px', borderRadius: '12px', cursor: 'pointer', fontWeight: '900' }}>LOGÍSTICA</button>
          <button onClick={() => setVista('contabilidad')} style={{ backgroundColor: vista === 'contabilidad' ? FUCSIA_PRINCIPAL : 'transparent', border: 'none', color: vista === 'contabilidad' ? '#fff' : FUCSIA_PRINCIPAL, padding: '12px 22px', borderRadius: '12px', cursor: 'pointer', fontWeight: '900' }}>GESTIÓN</button>
        </nav>
      </header>

      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '30px 20px' }}>
        
        {/* VISTA VENTAS */}
        {vista === 'ventas' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '35px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '25px' }}>
              <div style={sCrd}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: FUCSIA_PRINCIPAL, fontWeight: '900', fontSize: '13px' }}>💰 EFECTIVO HOY (LIQUIDO)</span>
                    <button onClick={handleExportarExcelCajaFull} style={{ background:`${FUCSIA_PRINCIPAL}20`, border:'none', padding:'8px 15px', borderRadius:'10px', color:FUCSIA_PRINCIPAL, fontWeight:'900', fontSize:'10px', cursor:'pointer' }}>CIERRE AUDITOR</button>
                </div>
                <h2 style={{ margin: '15px 0', fontSize: '3.5rem', fontWeight: '900' }}>S/ {balanceEliteBJ.cH.toFixed(2)}</h2>
                <div style={{ color: VERDE_BJ, fontWeight: '900', fontSize: '15px' }}>Ganancia Día: S/ {balanceEliteBJ.gH.toFixed(2)}</div>
              </div>
              <div style={sCrd}>
                <span style={{ color: FUCSIA_PRINCIPAL, fontWeight: '900', fontSize: '13px' }}>📅 BUSCAR HISTORIAL BJ</span>
                <input type="date" value={fechaConsulta} onChange={e => setFechaConsulta(e.target.value)} style={{ ...sInp, marginTop: '15px' }} />
              </div>
            </div>

            <div style={{ ...sCrd, border: `3px solid #FCA5D4` }}>
              <h3 style={{ margin: 0, color: FUCSIA_PRINCIPAL, fontWeight: '900', marginBottom:'25px' }}>🛒 Registrar Operación Chiclayo</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px', marginBottom: '30px' }}>
                <input list="clis_v79" placeholder="👤 Nombre Cliente" value={cliente} onChange={handleAutocompleteCliente} style={sInp} />
                <datalist id="clis_v79">{[...new Set(ventas.map(v => v.cliente_nombre))].map((c, i) => <option key={i} value={c} />)}</datalist>
                <input placeholder="📍 Zona" value={localidad} onChange={e => setLocalidad(e.target.value)} style={sInp} />
                <input placeholder="📱 WhatsApp" value={telefono} onChange={e => setTelefono(e.target.value)} style={sInp} />
              </div>

              {carrito.length > 0 && (
                <div style={{ backgroundColor: '#FFF9FB', border: `2px dashed ${FUCSIA_PRINCIPAL}`, borderRadius: '25px', padding: '30px', marginBottom: '40px' }}>
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

              <input placeholder="🔍 Buscar modelo..." value={busqueda} onChange={e => setBusqueda(e.target.value)} style={{ ...sInp, marginBottom: '25px', height: '65px' }} />
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
                      <select value={coloresElegidos[p.id]} onChange={e => setColoresElegidos({...coloresElegidos, [p.id]: e.target.value})} style={{ ...sInp, padding: '10px', fontSize: '14px', marginBottom: '18px', height: '50px' }}>
                        {p.colores?.split(',').map(c => <option key={c} value={c.trim()}>{c.trim()}</option>)}
                      </select>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '18px', marginBottom: '22px' }}>
                        <button onClick={() => setCantidades({...cantidades, [p.id]: Math.max(1, (cantidades[p.id] || 1) - 1)})} style={{ border: 'none', background: '#f5f5f5', borderRadius: '12px', width: '48px', height: '48px', cursor:'pointer' }}>-</button>
                        <span style={{ fontWeight: '900', fontSize: '22px', paddingTop:'10px' }}>{cantidades[p.id] || 1}</span>
                        <button onClick={() => setCantidades({...cantidades, [p.id]: Math.min(p.stock, (cantidades[p.id] || 1) + 1)})} style={{ border: 'none', background: '#f5f5f5', borderRadius: '12px', width: '48px', height: '48px', cursor:'pointer' }}>+</button>
                      </div>
                      <button onClick={() => {
                        const canE = Number(cantidades[p.id] || 1);
                        const preE = tipoVenta === 'Mayor' ? p.precio_venta : (p.precio_menor || p.precio_venta);
                        const enC = carrito.filter(i => i.producto_id === p.id).reduce((acc, i) => acc + i.cantidad, 0);
                        if ((Number(p.stock) || 0) < canE + enC) return alert("¡Sin stock!");
                        setCarrito([...carrito, { producto_id: p.id, nombre: p.nombre, cantidad: canE, color: (coloresElegidos[p.id] || "Único"), precio_venta: preE, precio_compra: p.precio_compra }]);
                      }} disabled={p.stock <= 0} style={{ width: '100%', backgroundColor: tipoVenta === 'Mayor' ? OSCURO_BJ : '#A13C6D', color: '#fff', border: 'none', padding: '18px', borderRadius: '22px', fontSize: '14px', fontWeight: '900', cursor:'pointer' }}>
                        {p.stock > 0 ? `VENDER S/ ${Number(pShowBJ).toFixed(2)}` : 'AGOTADO'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={sCrd}>
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
                                    let msgBJ = `¡Hola *${grupo.cliente_nombre}*! 👋 Recibo de BJ Chiclayo.%0A%0A`;
                                    grupo.items.forEach(v => {
                                        const pR = productos.find(p => p.id === v.producto_id);
                                        msgBJ += `- *${v.cantidad}x* ${pR?.nombre || 'Item'} (${v.color}): S/ ${(v.precio_venta_unitario * v.cantidad).toFixed(2)}%0A`;
                                    });
                                    msgBJ += `%0A*TOTAL PAGADO: S/ ${grupo.total.toFixed(2)}*%0A¡Gracias! 😊`;
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

        {/* LOGÍSTICA DETALLADA */}
        {vista === 'logistica' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '35px' }}>
            <div style={sCrd}>
                <h3 style={{ margin: 0, fontSize: '1.6rem', fontWeight: '900', color: FUCSIA_PRINCIPAL, marginBottom:'25px' }}>📦 Entregas Pendientes (Pagado en Local)</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
                    {logisticaInteligente.almacen.map((grupo, idx) => (
                        <div key={idx} style={{ padding: '25px', border: '2px solid #F1F5F9', borderRadius: '25px', backgroundColor: '#fff' }}>
                            <div style={{display:'flex', justifyContent:'space-between', marginBottom:'15px'}}>
                                <div><strong>{grupo.cliente}</strong><br/><small style={{color: '#64748B'}}>📍 {grupo.localidad}</small></div>
                                <button onClick={() => {
                                    let listaWA = grupo.items.map(i => `${i.cantidad}x ${i.nombre}`).join(', ');
                                    let m = `¡Hola *${grupo.cliente}*! 👋 Tu pedido de: ${listaWA} ya está listo. ✨📦`;
                                    window.open(`https://wa.me/51${grupo.telefono?.replace(/\D/g,'')}?text=${encodeURI(m)}`, '_blank');
                                }} style={{ background:'#25D366', color:'#fff', border:'none', padding:'10px 15px', borderRadius:'12px', fontWeight:'900', cursor:'pointer' }}>AVISAR 📱</button>
                            </div>
                            <div style={{ background: '#F8FAFC', padding: '15px', borderRadius: '18px', marginBottom: '15px' }}>
                                {grupo.items.map((it, i) => (
                                    <div key={i} style={{ fontSize: '14px', marginBottom: '4px' }}>
                                        <span><strong>{it.cantidad}x</strong> {it.nombre}</span> <small>({it.color})</small>
                                    </div>
                                ))}
                            </div>
                            <button onClick={async () => {
                                if(confirm("¿Confirmar entrega física?")) {
                                    for(let idV of grupo.items_ids) { await supabase.from('ventas').update({estado_pedido:'Entregado'}).eq('id', idV); }
                                    alert("✅ Entregado."); await cargarTodoDesdeNube();
                                }
                            }} style={{ width: '100%', backgroundColor: OSCURO_BJ, color: '#fff', border: 'none', padding: '15px', borderRadius: '15px', fontWeight: '900', cursor:'pointer' }}>CONFIRMAR ENTREGA ✅</button>
                        </div>
                    ))}
                    {logisticaInteligente.almacen.length === 0 && <p style={{opacity:0.5}}>No hay paquetes pendientes.</p>}
                </div>
            </div>

            <div style={{ ...sCrd, borderLeft: `15px solid ${AMARILLO_BJ}` }}>
                <h3 style={{ margin: 0, fontSize: '1.6rem', fontWeight: '900', color: AMARILLO_BJ, marginBottom:'25px' }}>💸 Cuentas Deudoras (Ventas a Crédito)</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
                    {logisticaInteligente.deudas.map((grupo, idx) => (
                        <div key={idx} style={{ padding: '25px', backgroundColor: '#FFFBEB', borderRadius: '25px', border:`2px solid ${AMARILLO_BJ}40` }}>
                            <div><strong>{grupo.cliente}</strong><br/><small>{grupo.localidad}</small></div>
                            <h4 style={{color:AMARILLO_BJ, margin:'10px 0'}}>DEUDA: S/ {grupo.total.toFixed(2)}</h4>
                            <div style={{ background: '#fff', padding: '12px', borderRadius: '15px', marginBottom: '15px' }}>
                                {grupo.items.map((it, i) => <div key={i} style={{ fontSize: '13px' }}>• {it.cantidad}x {it.nombre}</div>)}
                            </div>
                            <button onClick={() => handleCobrarDeudaBJ(grupo)} style={{ width: '100%', backgroundColor: VERDE_BJ, color: '#fff', border: 'none', padding: '18px', borderRadius: '15px', fontWeight: '900', cursor:'pointer' }}>💰 REGISTRAR PAGO TOTAL</button>
                        </div>
                    ))}
                </div>
            </div>
          </div>
        )}

        {/* VISTA GESTIÓN RESTAURADA */}
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
                    <small style={{opacity:0.6}}>Ganancia neta acumulada menos tus retiros de utilidades.</small>
                </div>
            </div>

            {/* TARJETAS RESTAURADAS AQUÍ */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '25px' }}>
                <div style={{ ...sCrd_BJ, borderLeft:`10px solid #64748B` }}>
                    <small style={{fontWeight:'900', opacity:0.6}}>CAPITAL EN ALMACÉN (COSTO PRODUCTOS)</small>
                    <h4 style={{fontSize:'2.2rem', margin:'10px 0'}}>S/ {valorizacionInventarioTotal.cost.toLocaleString('es-PE')}</h4>
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
                            <option value="Ganancias">De: Ganancias</option>
                        </select>
                    </div>
                    <input placeholder="Descripción..." value={formFinanzas.descripcion} onChange={e => setFormFinanzas({...formFinanzas, descripcion: e.target.value})} style={sInp_BJ} />
                    <input placeholder="Monto S/" value={formFinanzas.monto} onChange={e => setFormFinanzas({...formFinanzas, monto: handleInputMonto(e.target.value)})} style={sInp_BJ} />
                    <button type="submit" style={{ backgroundColor: FUCSIA_PRINCIPAL, color: '#fff', border: 'none', padding: '18px', borderRadius: '18px', fontWeight: '900', cursor:'pointer' }}>GUARDAR REGISTRO</button>
                  </form>
                </div>
                <div style={{ ...sCrd_BJ, border: `3px solid ${FUCSIA_PRINCIPAL}` }}>
                  <h4 style={{ marginTop: 0, marginBottom: '25px', fontWeight: '900', fontSize:'1.2rem' }}>🆕 Subir Nuevo Producto</h4>
                  <form onSubmit={handleAddProductoBJ} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <input placeholder="Nombre Modelo" value={formProd.nombre} onChange={e => setFormProd({...formProd, nombre: e.target.value})} style={sInp_BJ} />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                        <input placeholder="Costo Compra" value={formProd.precio_compra} onChange={e => setFormProd({...formProd, precio_compra: handleInputMonto(e.target.value)})} style={sInp_BJ} />
                        <input placeholder="Venta Mayor" value={formProd.precio_venta} onChange={e => setFormProd({...formProd, precio_venta: handleInputMonto(e.target.value)})} style={sInp_BJ} />
                    </div>
                    <input placeholder="Stock Inicial" value={formProd.stock} onChange={e => setFormProd({...formProd, stock: e.target.value})} style={sInp_BJ} />
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
                <h4 style={{ marginTop: 0, color: FUCSIA_PRINCIPAL, marginBottom: '35px', fontWeight: '900', fontSize: '1.4rem' }}>📈 ROI / Retorno de Inversión Almacén</h4>
                <div style={{ height: '400px', width: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={seriesROIConfigBJ} margin={{ top: 25, right: 30, left: -5, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                            <XAxis dataKey="n" fontSize={13} fontWeight="900" axisLine={false} tickLine={false} dy={15} />
                            <YAxis fontSize={13} axisLine={false} tickLine={false} />
                            <Tooltip contentStyle={{ borderRadius: '25px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.15)', fontWeight: '900' }} />
                            <Bar dataKey="v" radius={[20, 20, 0, 0]} barSize={90}>
                                {seriesROIConfigBJ.map((entry, index) => ( <Cell key={index} fill={entry.fill} /> ))}
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

const sCrd_BJ = { backgroundColor: '#ffffff', borderRadius: '35px', padding: '35px', boxShadow: `0 20px 40px rgba(247, 134, 193, 0.1)`, border: '1px solid #FFF1F2' };
const sInp_BJ = { padding: '16px', borderRadius: '16px', border: `2px solid #FCC2E2`, width: '100%', outline: 'none', fontSize: '15px', boxSizing: 'border-box', backgroundColor: '#fff' };