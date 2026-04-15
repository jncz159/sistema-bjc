"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from './supabaseClient';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid, Cell 
} from 'recharts';

/**
 * ============================================================================
 * SISTEMA BJ IMPORTACIONES CHICLAYO - VERSION 95.0
 * ARCHIVO: page.js (ESTRUCTURA DE INGENIERÍA MAESTRA TOTAL)
 * ESTADO: FIX VENTAS NO APARECEN + FIX CAJA DIARIA + BALANCES REALES
 * ============================================================================
 */

export default function SistemaBJCMasterFinal() {
  
  // ============================================================================
  // [ZONA 1: HELPERS Y SEGURIDAD]
  // ============================================================================

  const getFechaPeru = (dateInput) => {
    try {
        const d = dateInput ? new Date(dateInput) : new Date();
        if (isNaN(d.getTime())) return new Date().toISOString().split('T')[0];
        // Forzamos el ajuste a la zona horaria de Perú (GMT-5) para evitar desfases con el servidor
        return d.toLocaleDateString('en-CA', { timeZone: "America/Lima" });
    } catch (e) { 
        return new Date().toISOString().split('T')[0]; 
    }
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
    const aTexto = String(v).replace(',', '.');
    return aTexto.replace(/[^0-9.]/g, '');
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
  // [ZONA 2: ALMACÉN DE ESTADOS (STATE)]
  // ============================================================================

  const [productos, setProductos] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [finanzas, setFinanzas] = useState([]);
  const [vista, setVista] = useState('ventas'); 
  const [cargando, setCargando] = useState(true);
  
  const [busqueda, setBusqueda] = useState(''); 
  const [busquedaStock, setBusquedaStock] = useState(''); 
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
  const [formEditStockBJ, setFormEditStockBJ] = useState({}); 

  const FUCSIA_PRINCIPAL = '#F01097';
  const VERDE_BJ = '#16A34A';
  const ROJO_BJ = '#E11D48';
  const AMARILLO_BJ = '#CA8A04';
  const OSCURO_BJ = '#1E1B1C';

  // ============================================================================
  // [ZONA 3: FUNCIONES DE ACCIÓN (VENTAS Y CRUD)]
  // ============================================================================

  const handleAutocompleteCliente = (e) => {
    const valInput = e.target.value; setCliente(valInput);
    const mCli = (ventas || []).find(v => v && v.cliente_nombre?.toLowerCase() === valInput.toLowerCase());
    if (mCli) { setLocalidad(mCli.localidad || ''); setTelefono(mCli.telefono || ''); }
  };

  const handleEjecutarVentaBJ = async (estadoOperativo) => {
    if (!cliente || !localidad) return alert("Nombre de cliente y Zona son obligatorios.");
    if (carrito.length === 0) return alert("El carrito está vacío.");
    
    const totalVentaNeto = carrito.reduce((acc, item) => acc + (Number(item.precio_venta) * item.cantidad), 0);
    const descTotal = Number(descuento) || 0;
    const ratioDesc = totalVentaNeto > 0 ? (descTotal / totalVentaNeto) : 0;

    const listaV = carrito.map(item => {
        const pvU = Number(item.precio_venta);
        const pcU = Number(item.precio_compra || 0);
        const cant = Number(item.cantidad);
        const subU = pvU * cant;
        const dProp = totalVentaNeto > 0 ? (subU * ratioDesc) : 0;
        const gananciaReal = (subU - dProp) - (pcU * cant);

        return { 
            cliente_nombre: cliente, localidad: localidad, telefono: telefono || '', producto_id: item.producto_id, 
            cantidad: cant, color: item.color, precio_venta_unitario: pvU, 
            precio_costo_unitario: pcU, ganancia_total: gananciaReal, estado_pedido: estadoOperativo 
        };
    });

    try {
        const { error } = await supabase.from('ventas').insert(listaV);
        if (!error) {
            for (const it of carrito) {
                const pO = productos.find(p => p.id === it.producto_id);
                if (pO) await supabase.from('productos').update({ stock: pO.stock - it.cantidad }).eq('id', it.producto_id);
            }
            // Reset de campos
            setCliente(''); setLocalidad(''); setTelefono(''); setCarrito([]); setDescuento(0); setCantidades({});
            alert("✅ Venta registrada correctamente.");
            await cargarTodoDesdeNube(); // Recarga forzosa de datos
        } else { throw error; }
    } catch (err) { alert("Error al registrar venta: " + err.message); }
  };

  const handleAddProductoBJ = async (e) => {
    if(e) e.preventDefault();
    if (!formProd.nombre) return alert("Nombre obligatorio.");
    const { error } = await supabase.from('productos').insert([{
        nombre: formProd.nombre, precio_compra: Number(handleInputMonto(formProd.precio_compra)),
        precio_venta: Number(handleInputMonto(formProd.precio_venta)), precio_menor: Number(handleInputMonto(formProd.precio_menor)),
        stock: Number(formProd.stock), colores: formProd.colores
    }]);
    if (!error) { setFormProd({ nombre: '', precio_compra: '', precio_venta: '', precio_menor: '', stock: '', colores: '' }); alert("✨ Modelo añadido."); await cargarTodoDesdeNube(); }
  };

  const handleRegistrarFinanzaBJ = async (e) => {
    if(e) e.preventDefault();
    const cl_M = handleInputMonto(formFinanzas.monto);
    if (!cl_M) return alert("Ingresa un monto.");
    const { error } = await supabase.from('finanzas').insert([{ tipo: formFinanzas.tipo, descripcion: formFinanzas.descripcion, monto: Number(cl_M), origen: formFinanzas.origen }]);
    if (!error) { setFormFinanzas({tipo:'Gasto Local', descripcion:'', monto:'', origen: 'Caja Global'}); alert("✅ Registro guardado."); await cargarTodoDesdeNube(); }
  };

  const handleSincronizarStockBJ = async (pId, nuevoStock) => {
    if (!nuevoStock && nuevoStock !== 0) return alert("Ingresa cantidad.");
    const { error } = await supabase.from('productos').update({ stock: Number(nuevoStock) }).eq('id', pId);
    if (!error) { alert("✅ Stock sincronizado."); await cargarTodoDesdeNube(); }
  };

  const handleCobrarDeudaBJ = async (grupo) => {
    if(confirm(`¿Confirmar cobro total de S/ ${grupo.total.toFixed(2)}?`)) {
        const idsV = grupo.items_ids || [];
        for(let id of idsV) { await supabase.from('ventas').update({ estado_pedido: 'Entregado' }).eq('id', id); }
        alert("💰 Pago recibido."); await cargarTodoDesdeNube();
    }
  };

  const handleAnularVentaBJ = async (v) => {
    if (confirm("¿Anular? El stock volverá al inventario.")) {
      const pc = productos.find(pr => pr.id === v.producto_id);
      if (pc) await supabase.from('productos').update({ stock: pc.stock + v.cantidad }).eq('id', pc.id);
      await supabase.from('ventas').delete().eq('id', v.id);
      await cargarTodoDesdeNube();
    }
  };

  // ============================================================================
  // [ZONA 4: LÓGICA DE PROCESAMIENTO (BALANCES BLINDADOS)]
  // ============================================================================

  const balanceEliteBJ = useMemo(() => {
    const s = { cH: 0, gH: 0, cG: 0, bR: 0, pe_p: 0, pe_g: 0, pe_m: 0 };
    if (!ventas.length && !finanzas.length) return s;
    try {
        const hoyS = getFechaPeru();
        const mesI = hoyS.substring(0,7);
        
        // --- DINERO HOY (Filtro por fecha corregido para Chiclayo) ---
        const vHoy = ventas.filter(v => v && getFechaPeru(v.created_at) === hoyS && v.estado_pedido !== 'Pendiente de Pago');
        
        // --- BOVEDA (Utilidad Neta) ---
        const gAcumTotal = ventas.reduce((acc, v) => acc + (Number(v?.ganancia_total) || 0), 0);
        const retUt = finanzas.filter(f => f && f.origen === 'Ganancias').reduce((acc, f) => acc + (Number(f.monto) || 0), 0);
        
        // --- CAJA GLOBAL (Dinero Real en Mano) ---
        const inSales = ventas.filter(v => v && v.estado_pedido !== 'Pendiente de Pago').reduce((acc, v) => acc + (Number(v.precio_venta_unitario) * Number(v.cantidad)), 0);
        const inCap = finanzas.filter(f => f && ['Ingreso Adicional','Inversión Inicial'].includes(f.tipo)).reduce((acc, f) => acc + (Number(f.monto) || 0), 0);
        const outExp = finanzas.filter(f => f && f.origen !== 'Ganancias' && !['Ingreso Adicional','Inversión Inicial'].includes(f.tipo)).reduce((acc, f) => acc + (Number(f.monto) || 0), 0);
        
        const cajaReal = (inSales + inCap) - outExp;

        // --- PTO EQUILIBRIO ---
        const metaM = finanzas.filter(f => f && getFechaPeru(f.created_at).substring(0,7) === mesI && ['Gasto Local','Retiro Personal'].includes(f.tipo)).reduce((acc, f) => acc + (Number(f.monto) || 0), 0);
        const utilM = ventas.filter(v => v && getFechaPeru(v.created_at).substring(0,7) === mesI && v.estado_pedido !== 'Pendiente de Pago').reduce((acc, v) => acc + (Number(v.ganancia_total) || 0), 0);
        
        return { 
            cH: vHoy.reduce((acc, v) => acc + (Number(v.precio_venta_unitario) * Number(v.cantidad)), 0),
            gH: vHoy.reduce((acc, v) => acc + Number(v.ganancia_total || 0), 0),
            cG: cajaReal,
            bR: (gAcumTotal - retUt),
            pe_p: metaM > 0 ? (utilM / metaM) * 100 : (utilM > 0 ? 100 : 0),
            pe_g: utilM, pe_m: metaM
        };
    } catch (e) { return s; }
  }, [finanzas, ventas]);

  const logisticaInteligente = useMemo(() => {
    const res = { almacen: [], deudas: [] };
    if (!ventas.length) return res;
    try {
        const mA = {}; const mD = {};
        ventas.forEach(v => {
            if (!v || !v.cliente_nombre) return;
            const key = `${v.cliente_nombre}-${v.localidad || 'SN'}`;
            const pMatch = productos.find(p => p.id === v.producto_id);
            const itD = { id: v.id, nombre: pMatch ? pMatch.nombre : "Producto", cantidad: v.cantidad, color: v.color };

            if (v.estado_pedido === 'En Almacén') {
                if (!mA[key]) mA[key] = { cliente: v.cliente_nombre, localidad: v.localidad, telefono: v.telefono, items: [], total: 0, items_ids: [] };
                mA[key].items.push(itD); mA[key].items_ids.push(v.id);
                mA[key].total += (Number(v.precio_venta_unitario || 0) * Number(v.cantidad || 0));
            }
            if (v.estado_pedido === 'Pendiente de Pago') {
                if (!mD[key]) mD[key] = { cliente: v.cliente_nombre, localidad: v.localidad, telefono: v.telefono, items: [], total: 0, items_ids: [] };
                mD[key].items.push(itD); mD[key].items_ids.push(v.id);
                mD[key].total += (Number(v.precio_venta_unitario || 0) * Number(v.cantidad || 0));
            }
        });
        res.almacen = Object.values(mA); res.deudas = Object.values(mD);
        return res;
    } catch (e) { return res; }
  }, [ventas, productos]);

  const valorizacionStock = useMemo(() => {
    let c = 0; let v = 0;
    productos.forEach(p => { if (p && Number(p.stock) > 0) { c += (Number(p.precio_compra || 0) * p.stock); v += (Number(p.precio_venta || 0) * p.stock); } });
    return { cost: c, vent: v };
  }, [productos]);

  const historialVentasDiaBJ = useMemo(() => {
    if (!ventas.length) return [];
    try {
        const filt = ventas.filter(v => v && getFechaPeru(v.created_at) === fechaConsulta);
        const agrup = {};
        filt.forEach(v => {
            const hId = `${v.cliente_nombre || 'S'}-${v.localidad || 'Z'}-${v.created_at?.substring(0,16)}`; 
            if (!agrup[hId]) agrup[hId] = { id_grupo: hId, cliente_nombre: v.cliente_nombre, localidad: v.localidad, telefono: v.telefono, hora: getHoraPeru(v.created_at), total: 0, items: [] };
            agrup[hId].items.push(v); agrup[hId].total += (Number(v.precio_venta_unitario ?? 0) * Number(v.cantidad ?? 0));
        });
        return Object.values(agrup).reverse();
    } catch (e) { return []; }
  }, [ventas, fechaConsulta]);

  // ============================================================================
  // [ZONA 5: CONEXIÓN SUPABASE]
  // ============================================================================

  const cargarTodoDesdeNube = async () => {
    try {
        const { data: p } = await supabase.from('productos').select('*').order('created_at', { ascending: false });
        const { data: v } = await supabase.from('ventas').select('*').order('created_at', { ascending: true });
        const { data: f } = await supabase.from('finanzas').select('*').order('created_at', { ascending: false });
        if (p) setProductos(p); if (v) setVentas(v); if (f) setFinanzas(f);
    } catch (e) { console.error("Error de Sincronización:", e); }
    finally { setCargando(false); }
  };

  useEffect(() => {
    cargarTodoDesdeNube();
    const timerArr = setTimeout(() => setCargando(false), 3000);
    return () => clearTimeout(timerArr);
  }, []);

  const handleExportarExcelCajaFull = () => {
    let csv = "REPORTE DE CIERRE Y AUDITORIA - BJ IMPORTACIONES\n";
    csv += `FECHA SELECCIONADA: ${fechaConsulta}\n`;
    csv += `CAJA TOTAL ACTUAL,S/ ${balanceEliteBJ.cG.toFixed(2)}\n`;
    csv += `EFECTIVO HOY (LIQUIDO),S/ ${balanceEliteBJ.cH.toFixed(2)}\n\n`;
    csv += "Hora,Cliente,Zona,Producto,Cant,Precio,Subtotal\n";
    ventas.filter(v => getFechaPeru(v.created_at) === fechaConsulta).forEach(v => {
      const nP = productos.find(p=>p.id===v.producto_id)?.nombre || "Item";
      csv += `${getHoraPeru(v.created_at)},${v.cliente_nombre},${v.localidad},${nP},${v.cantidad},${v.precio_venta_unitario},${(v.precio_venta_unitario*v.cantidad).toFixed(2)}\n`;
    });
    const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    link.download = `BJ_AUDITORIA_${fechaConsulta}.csv`; link.click();
  };

  // ============================================================================
  // [ZONA 6: INTERFAZ DE USUARIO (JSX)]
  // ============================================================================

  const styleInp = { padding: '16px', borderRadius: '16px', border: `2px solid #FCC2E2`, width: '100%', outline: 'none', fontSize: '15px', boxSizing: 'border-box', backgroundColor: '#fff', transition: '0.3s' };
  const styleCrd = { backgroundColor: '#ffffff', borderRadius: '35px', padding: '35px', boxShadow: `0 20px 40px rgba(247, 134, 193, 0.1)`, border: '1px solid #FFF1F2' };

  if (cargando) return <div style={{ height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', backgroundColor:'#FFF5F7', color:FUCSIA_PRINCIPAL, fontWeight:'900', fontSize:'1.5rem' }}>SINCRONIZANDO BUNKER BJ v95... 🚀💎</div>;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FFF5F7', color: OSCURO_BJ, fontFamily: 'system-ui, sans-serif' }}>
      
      {/* NAVBAR GLOBAL */}
      <header style={{ backgroundColor: '#ffffff', padding: '15px 5%', position: 'sticky', top: 0, zIndex: 100, display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: `0 4px 15px rgba(0,0,0,0.06)` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ backgroundColor: FUCSIA_PRINCIPAL, color: '#fff', width: '45px', height: '45px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '1.2rem' }}>BJ</div>
          <div><h1 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '900', color: FUCSIA_PRINCIPAL }}>BJ IMPORTACIONES</h1><small style={{ color: '#64748B', fontWeight: '900', fontSize: '9px' }}>v95 MASTER SYNC</small></div>
        </div>
        <nav style={{ display: 'flex', gap: '8px', backgroundColor: `#FCA5D415`, padding: '5px', borderRadius: '15px', flexWrap:'wrap' }}>
          <button onClick={() => setVista('ventas')} style={{ backgroundColor: vista === 'ventas' ? FUCSIA_PRINCIPAL : 'transparent', border: 'none', color: vista === 'ventas' ? '#fff' : FUCSIA_PRINCIPAL, padding: '10px 15px', borderRadius: '10px', cursor: 'pointer', fontWeight: '900' }}>VENTAS</button>
          <button onClick={() => setVista('stock')} style={{ backgroundColor: vista === 'stock' ? FUCSIA_PRINCIPAL : 'transparent', border: 'none', color: vista === 'stock' ? '#fff' : FUCSIA_PRINCIPAL, padding: '10px 15px', borderRadius: '10px', cursor: 'pointer', fontWeight: '900' }}>ALMACÉN</button>
          <button onClick={() => setVista('logistica')} style={{ backgroundColor: vista === 'logistica' ? OSCURO_BJ : 'transparent', border: 'none', color: vista === 'logistica' ? '#fff' : OSCURO_BJ, padding: '10px 15px', borderRadius: '10px', cursor: 'pointer', fontWeight: '900' }}>LOGÍSTICA</button>
          <button onClick={() => setVista('contabilidad')} style={{ backgroundColor: vista === 'contabilidad' ? FUCSIA_PRINCIPAL : 'transparent', border: 'none', color: vista === 'contabilidad' ? '#fff' : FUCSIA_PRINCIPAL, padding: '10px 15px', borderRadius: '10px', cursor: 'pointer', fontWeight: '900' }}>GESTIÓN</button>
        </nav>
      </header>

      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '30px 20px' }}>
        
        {/* VISTA VENTAS */}
        {vista === 'ventas' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '35px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '25px' }}>
              <div style={styleCrd}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: FUCSIA_PRINCIPAL, fontWeight: '900', fontSize: '13px' }}>💰 EFECTIVO HOY (LIQUIDO)</span>
                    <button onClick={handleExportarExcelCajaFull} style={{ background:`${FUCSIA_PRINCIPAL}20`, border:'none', padding:'8px 15px', borderRadius:'10px', color:FUCSIA_PRINCIPAL, fontWeight:'900', fontSize:'10px', cursor:'pointer' }}>CIERRE AUDITOR</button>
                </div>
                <h2 style={{ margin: '15px 0', fontSize: '3.5rem', fontWeight: '900' }}>S/ {balanceEliteBJ.cH.toFixed(2)}</h2>
                <div style={{ color: VERDE_BJ, fontWeight: '900' }}>Ganancia Día: S/ {balanceEliteBJ.gH.toFixed(2)}</div>
              </div>
              <div style={styleCrd}>
                <span style={{ color: FUCSIA_PRINCIPAL, fontWeight: '900', fontSize: '13px' }}>📅 BUSCAR HISTORIAL BJ</span>
                <input type="date" value={fechaConsulta} onChange={e => setFechaConsulta(e.target.value)} style={{ ...styleInp, marginTop: '15px' }} />
              </div>
            </div>

            <div style={{ ...styleCrd, border: `3px solid #FCA5D4` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom:'25px' }}>
                <h3 style={{ margin: 0, color: FUCSIA_PRINCIPAL, fontWeight: '900' }}>🛒 Registrar Operación Chiclayo</h3>
                <div style={{ display: 'flex', backgroundColor: '#F1F5F9', borderRadius: '18px', padding: '6px' }}>
                  <button onClick={() => setTipoVenta('Mayor')} style={{ border: 'none', padding: '10px 22px', borderRadius: '12px', cursor: 'pointer', fontSize: '13px', fontWeight: '900', backgroundColor: tipoVenta === 'Mayor' ? FUCSIA_PRINCIPAL : 'transparent', color: tipoVenta === 'Mayor' ? '#fff' : '#64748B' }}>MAYOR</button>
                  <button onClick={() => setTipoVenta('Menor')} style={{ border: 'none', padding: '10px 22px', borderRadius: '12px', cursor: 'pointer', fontSize: '13px', fontWeight: '900', backgroundColor: tipoVenta === 'Menor' ? OSCURO_BJ : 'transparent', color: tipoVenta === 'Menor' ? '#fff' : '#64748B' }}>MENOR</button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px', marginBottom: '30px' }}>
                <input list="clis_v95" placeholder="👤 Cliente" value={cliente} onChange={handleAutocompleteCliente} style={styleInp} />
                <datalist id="clis_v95">{[...new Set(ventas.map(v => v.cliente_nombre))].map((c, i) => <option key={i} value={c} />)}</datalist>
                <input placeholder="📍 Zona" value={localidad} onChange={e => setLocalidad(e.target.value)} style={styleInp} />
                <input placeholder="📱 WhatsApp" value={telefono} onChange={e => setTelefono(e.target.value)} style={styleInp} />
              </div>

              {carrito.length > 0 && (
                <div style={{ backgroundColor: '#FFF9FB', border: `2px dashed ${FUCSIA_PRINCIPAL}`, borderRadius: '25px', padding: '30px', marginBottom: '40px' }}>
                  {carrito.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #FCC2E2', paddingBottom: '15px', marginBottom: '12px' }}>
                      <div style={{ flex: 1 }}><strong>{item.cantidad}x</strong> {item.nombre} <br/><small style={{ color: FUCSIA_PRINCIPAL }}>{item.color}</small></div>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <input value={item.precio_venta} onChange={(e) => { const n = [...carrito]; n[idx].precio_venta = handleInputMonto(e.target.value); setCarrito(n); }} style={{ width: '80px', borderRadius: '10px', border: '1px solid #FCA5D4', textAlign: 'center', fontSize: '17px', fontWeight: '900' }} />
                        <button onClick={() => { const n = [...carrito]; n.splice(idx, 1); setCarrito(n); }} style={{ color: '#fff', backgroundColor: FUCSIA_PRINCIPAL, border: 'none', borderRadius: '50%', width: '35px', height: '35px', cursor: 'pointer' }}>X</button>
                      </div>
                    </div>
                  ))}
                  <div style={{ textAlign: 'right', marginTop: '30px' }}>
                    <span style={{ fontSize: '14px', fontWeight: '900' }}>DSCTO S/ </span>
                    <input type="text" value={descuento} onChange={e=>setDescuento(handleInputMonto(e.target.value))} style={{ width: '100px', padding: '10px', borderRadius: '15px', border: `2px solid ${FUCSIA_PRINCIPAL}`, textAlign: 'center', fontWeight: '900' }} />
                    <h3 style={{ margin: '10px 0', fontSize: '2.8rem', fontWeight: '900' }}>Total: S/ {(carrito.reduce((acc, i) => acc + (Number(i.precio_venta) * i.cantidad), 0) - Number(descuento)).toFixed(2)}</h3>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
                    <button onClick={() => handleEjecutarVentaBJ('Entregado')} style={{ backgroundColor: OSCURO_BJ, color: '#fff', border: 'none', padding: '18px', borderRadius: '18px', fontWeight: '900', cursor:'pointer' }}>✅ ENTREGA</button>
                    <button onClick={() => handleEjecutarVentaBJ('En Almacén')} style={{ backgroundColor: FUCSIA_PRINCIPAL, color: '#fff', border: 'none', padding: '18px', borderRadius: '18px', fontWeight: '900', cursor:'pointer' }}>📦 ALMACÉN</button>
                    <button onClick={() => handleEjecutarVentaBJ('Pendiente de Pago')} style={{ backgroundColor: AMARILLO_BJ, color: '#fff', border: 'none', padding: '18px', borderRadius: '18px', fontWeight: '900', cursor:'pointer' }}>💸 CRÉDITO</button>
                  </div>
                </div>
              )}

              <input placeholder="🔍 Buscar modelo..." value={busqueda} onChange={e => setBusqueda(e.target.value)} style={{ ...styleInp, marginBottom: '25px', height: '60px' }} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '25px', maxHeight: '600px', overflowY: 'auto' }}>
                {productos.filter(p => p.nombre?.toLowerCase().includes(busqueda.toLowerCase())).map((p) => {
                  const tagBJ = getEtiquetaProducto(p.created_at);
                  const pSh = tipoVenta === 'Mayor' ? p.precio_venta : (p.precio_menor || p.precio_venta);
                  const sLow = Number(p.stock || 0) < 5;
                  return (
                    <div key={p.id} style={{ border: sLow ? `2px solid ${ROJO_BJ}` : '1px solid #FFF1F2', padding: '22px', borderRadius: '35px', position: 'relative', backgroundColor:'#fff' }}>
                        {tagBJ && <span style={{ position:'absolute', top: '-10px', left: '20px', backgroundColor: tagBJ.color, color: '#fff', fontSize: '10px', padding: '6px 15px', borderRadius: '15px', fontWeight: '900' }}>{tagBJ.tipo}</span>}
                        <strong style={{ display: 'block', height: '40px', overflow: 'hidden' }}>{p.nombre}</strong>
                        <div style={{ color: sLow ? ROJO_BJ : VERDE_BJ, fontWeight: '900', margin: '10px 0', textAlign:'center' }}>STOCK: {p.stock} U.</div>
                        <div style={{ marginBottom: '15px' }}>
                            <select value={coloresElegidos[p.id]} onChange={e => setColoresElegidos({...coloresElegidos, [p.id]: e.target.value})} style={{...styleInp, padding:'8px', fontSize:'13px', marginBottom:'10px'}}>
                                {p.colores?.split(',').map(c => <option key={c} value={c.trim()}>{c.trim()}</option>)}
                            </select>
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px' }}>
                                <button onClick={() => setCantidades({...cantidades, [p.id]: Math.max(1, (cantidades[p.id] || 1) - 1)})} style={{ border: 'none', background: '#f1f1f1', borderRadius: '10px', width: '35px', height: '35px', cursor:'pointer' }}>-</button>
                                <span style={{ fontWeight: '900' }}>{cantidades[p.id] || 1}</span>
                                <button onClick={() => setCantidades({...cantidades, [p.id]: Math.min(p.stock, (cantidades[p.id] || 1) + 1)})} style={{ border: 'none', background: '#f1f1f1', borderRadius: '10px', width: '35px', height: '35px', cursor:'pointer' }}>+</button>
                            </div>
                        </div>
                        <button onClick={() => {
                            const cE = Number(cantidades[p.id] || 1);
                            const clE = coloresElegidos[p.id] || p.colores?.split(',')[0]?.trim() || "Único";
                            setCarrito([...carrito, { producto_id: p.id, nombre: p.nombre, cantidad: cE, color: clE, precio_venta: pSh, precio_compra: p.precio_compra }]);
                        }} disabled={p.stock <= 0} style={{ width: '100%', backgroundColor: FUCSIA_PRINCIPAL, color: '#fff', border: 'none', padding: '15px', borderRadius: '22px', fontSize: '13px', fontWeight: '900', cursor:'pointer' }}>
                            VENDER S/ {Number(pSh).toFixed(2)}
                        </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={styleCrd}>
                <h4 style={{margin:0, color:'#64748B', fontWeight:'900', fontSize:'13px', textTransform:'uppercase', marginBottom:'25px'}}>📜 Historial de Operaciones Diarias</h4>
                {historialVentasDiaBJ.map(grupo => (
                    <div key={grupo.id_grupo} style={{ padding: '25px', backgroundColor: '#FFF5F7', borderRadius: '25px', border: `1px solid #FCC2E2`, marginBottom:'20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                            <div>
                                <small style={{ fontWeight:'900', color: FUCSIA_PRINCIPAL }}>⏰ {grupo.hora}</small>
                                <br/><strong style={{ color: OSCURO_BJ, fontSize: '22px' }}>{grupo.cliente_nombre}</strong>
                                <br/><small>📍 {grupo.localidad} | 📱 {grupo.telefono}</small>
                            </div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <div style={{ backgroundColor: VERDE_BJ, color: '#fff', padding: '10px 20px', borderRadius: '12px', fontWeight: '900' }}>S/ {grupo.total.toFixed(2)}</div>
                                <button onClick={() => {
                                    let msgBJ = `¡Hola *${grupo.cliente_nombre}*! 👋 Recibo de *BJ Chiclayo*.%0A%0A`;
                                    grupo.items.forEach(v => {
                                        msgBJ += `- *${v.cantidad}x* ${v.color}: S/ ${(v.precio_venta_unitario * v.cantidad).toFixed(2)}%0A`;
                                    });
                                    msgBJ += `%0A*TOTAL PAGADO: S/ ${grupo.total.toFixed(2)}*%0A¡Gracias! 😊`;
                                    window.open(`https://wa.me/51${grupo.telefono?.replace(/\D/g,'')}?text=${msgBJ}`, '_blank');
                                }} style={{ backgroundColor: '#25D366', color: '#fff', border: 'none', padding: '10px 15px', borderRadius: '12px', fontWeight:'900', cursor:'pointer' }}>TICKET 📱</button>
                            </div>
                        </div>
                        <div style={{marginTop:'15px'}}>{grupo.items.map(v => (
                            <div key={v.id} style={{background:'#fff', padding:'10px 20px', borderRadius:'15px', marginBottom:'8px', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                                <div><small>{v.cantidad}x {productos.find(p=>p.id===v.producto_id)?.nombre} ({v.color}) | <span style={{color: v.estado_pedido === 'Pendiente de Pago' ? AMARILLO_BJ : '#64748B'}}>{v.estado_pedido}</span></small></div>
                                <button onClick={()=>handleAnularVentaBJ(v)} style={{border:'none', background:'none', color:ROJO_BJ, fontWeight:'bold', cursor:'pointer'}}>🗑️</button>
                            </div>
                        ))}</div>
                    </div>
                ))}
            </div>
          </div>
        )}

        {/* VISTA ALMACÉN */}
        {vista === 'stock' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '35px' }}>
            <div style={{ ...styleCrd, backgroundColor: OSCURO_BJ, color: '#fff', textAlign: 'center' }}>
                <h2 style={{ margin: 0, fontSize: '2.5rem' }}>📦 Inventario Físico BJ</h2>
                <p style={{ opacity: 0.7 }}>Control detallado del stock real en Chiclayo.</p>
            </div>
            <div style={styleCrd}>
              <input placeholder="🔍 Buscar en almacén..." value={busquedaStock} onChange={e => setBusquedaStock(e.target.value)} style={{ ...styleInp, marginBottom: '30px' }} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '25px' }}>
                {productos.filter(p => p.nombre?.toLowerCase().includes(busquedaStock.toLowerCase())).map((p) => (
                    <div key={p.id} style={{ border: '1px solid #F1F5F9', padding: '25px', borderRadius: '30px', backgroundColor: '#fff' }}>
                        <strong style={{ fontSize: '1.1rem', display:'block', marginBottom:'15px' }}>{p.nombre}</strong>
                        <div style={{ background: '#F8FAFC', padding: '15px', borderRadius: '20px', marginBottom: '15px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <small style={{ opacity: 0.6 }}>STOCK ACTUAL:</small>
                                <strong style={{ color: p.stock < 5 ? ROJO_BJ : OSCURO_BJ }}>{p.stock} U.</strong>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <input type="number" placeholder="Nuevo" value={formEditStockBJ[p.id] || ''} onChange={(e) => setFormEditStockBJ({...formEditStockBJ, [p.id]: e.target.value})} style={{ ...styleInp, padding: '10px', flex: 1 }} />
                            <button onClick={() => handleSincronizarStockBJ(p.id, formEditStockBJ[p.id])} style={{ backgroundColor: OSCURO_BJ, color: '#fff', border: 'none', padding: '0 20px', borderRadius: '15px', fontWeight: '900', cursor: 'pointer' }}>SYNC</button>
                        </div>
                    </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* VISTA LOGÍSTICA */}
        {vista === 'logistica' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '35px' }}>
            <div style={styleCrd}>
                <h3 style={{ margin: 0, fontSize: '1.6rem', fontWeight: '900', color: FUCSIA_PRINCIPAL, marginBottom:'25px' }}>📦 Entregas Pendientes (Pagado)</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
                    {logisticaInteligente.almacen.map((grupo, idx) => (
                        <div key={idx} style={{ padding: '25px', border: '2px solid #F1F5F9', borderRadius: '25px', backgroundColor: '#fff' }}>
                            <div style={{display:'flex', justifyContent:'space-between', marginBottom:'15px'}}>
                                <div><strong>{grupo.cliente}</strong><br/><small style={{color: '#64748B'}}>📍 {grupo.localidad}</small></div>
                            </div>
                            <div style={{ background: '#F8FAFC', padding: '15px', borderRadius: '18px', marginBottom: '15px' }}>
                                {grupo.items.map((it, i) => <div key={i} style={{ fontSize: '14px' }}>• {it.cantidad}x {it.nombre} ({it.color})</div>)}
                            </div>
                            <button onClick={() => handleCobrarDeudaBJ(grupo)} style={{ width: '100%', backgroundColor: OSCURO_BJ, color: '#fff', border: 'none', padding: '15px', borderRadius: '15px', fontWeight: '900', cursor:'pointer' }}>MARCAR ENTREGADO ✅</button>
                        </div>
                    ))}
                    {logisticaInteligente.almacen.length === 0 && <p style={{opacity:0.5}}>Sin entregas pendientes.</p>}
                </div>
            </div>

            <div style={{ ...styleCrd, borderLeft: `15px solid ${AMARILLO_BJ}` }}>
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
                    {logisticaInteligente.deudas.length === 0 && <p style={{opacity:0.5}}>Sin deudas pendientes.</p>}
                </div>
            </div>
          </div>
        )}

        {/* VISTA GESTIÓN */}
        {vista === 'contabilidad' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '45px' }}>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '30px' }}>
                <div style={styleCrd}>
                    <h4 style={{margin:0, color:FUCSIA_PRINCIPAL, fontSize:'14px', fontWeight:'900', marginBottom:'15px'}}>🏁 PUNTO DE EQUILIBRIO</h4>
                    <div style={{height:'20px', width:'100%', backgroundColor:'#F1F5F9', borderRadius:'10px', overflow:'hidden', marginBottom:'15px', border:'1px solid #eee'}}>
                        <div style={{height:'100%', width:`${balanceEliteBJ.pe_p}%`, backgroundColor:VERDE_BJ, transition:'1s'}}></div>
                    </div>
                    <div style={{display:'flex', justifyContent:'space-between', fontSize:'13px'}}>
                        <span>Utilidad Mes: S/ {balanceEliteBJ.pe_g.toFixed(2)}</span>
                        <strong>Meta: S/ {balanceEliteBJ.pe_m.toFixed(2)}</strong>
                    </div>
                </div>

                <div style={{ ...styleCrd, backgroundColor: OSCURO_BJ, color: '#fff', border:`4px solid ${FUCSIA_PRINCIPAL}` }}>
                    <h4 style={{margin:0, color:FUCSIA_PRINCIPAL, fontSize:'14px', fontWeight:'900', marginBottom:'15px'}}>💰 BÓVEDA PARA RETIRO (UTILIDAD DISPO)</h4>
                    <h3 style={{fontSize:'3.2rem', margin:0, color:'#fff'}}>S/ {balanceEliteBJ.bR.toFixed(2)}</h3>
                    <small style={{opacity:0.6}}>Ganancia neta acumulada menos retiros personales marcados "De Ganancias".</small>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '25px' }}>
                <div style={{ ...styleCrd, borderLeft:`10px solid #64748B` }}>
                    <small style={{fontWeight:'900', opacity:0.6}}>CAPITAL EN MERCADERÍA (COSTO PRODUCTOS)</small>
                    <h4 style={{fontSize:'2.2rem', margin:'10px 0'}}>S/ {valorizacionStock.cost.toLocaleString('es-PE')}</h4>
                </div>
                <div style={{ ...styleCrd, borderLeft:`10px solid ${AMARILLO_BJ}` }}>
                    <small style={{fontWeight:'900', opacity:0.6}}>CAJA TOTAL ACTUAL (DINERO REAL EN MANO)</small>
                    <h4 style={{fontSize:'2.2rem', margin:'10px 0'}}>S/ {balanceEliteBJ.cG.toFixed(2)}</h4>
                </div>
                <div style={{ ...styleCrd, borderLeft:`10px solid ${FUCSIA_PRINCIPAL}` }}>
                    <small style={{fontWeight:'900', opacity:0.6}}>VALOR VENTA TOTAL (POTENCIAL DINERO)</small>
                    <h4 style={{fontSize:'2.2rem', margin:'10px 0'}}>S/ {valorizacionStock.vent.toLocaleString('es-PE')}</h4>
                </div>
            </div>

            {/* FORMULARIOS DE REGISTRO */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '45px' }}>
                <div style={styleCrd}>
                  <h4 style={{ marginTop: 0, marginBottom: '25px', fontWeight: '900' }}>💸 Movimiento de Caja Detallado</h4>
                  <form onSubmit={handleRegistrarFinanzaBJ} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'15px'}}>
                        <select value={formFinanzas.tipo} onChange={e => setFormFinanzas({...formFinanzas, tipo: e.target.value})} style={styleInp}>
                            <option value="Gasto Local">🏪 Gasto Local</option>
                            <option value="Inversión (Mercadería)">📦 Inversión</option>
                            <option value="Retiro Personal">🏧 Retiro Personal</option>
                            <option value="Ingreso Adicional">💰 Ingreso Adicional</option>
                        </select>
                        <select value={formFinanzas.origen} onChange={e => setFormFinanzas({...formFinanzas, origen: e.target.value})} style={{...styleInp, border:`2px solid ${AMARILLO_BJ}`}}>
                            <option value="Caja Global">Bolsa: Caja Global</option>
                            <option value="Ganancias">Bolsa: Ganancias</option>
                        </select>
                    </div>
                    <input placeholder="Descripción..." value={formFinanzas.descripcion} onChange={e => setFormFinanzas({...formFinanzas, descripcion: e.target.value})} style={styleInp} />
                    <input placeholder="Monto S/" value={formFinanzas.monto} onChange={e => setFormFinanzas({...formFinanzas, monto: handleInputMonto(e.target.value)})} style={styleInp} />
                    <button type="submit" style={{ backgroundColor: FUCSIA_PRINCIPAL, color: '#fff', border: 'none', padding: '18px', borderRadius: '18px', fontWeight: '900', cursor:'pointer' }}>GUARDAR REGISTRO</button>
                  </form>
                </div>
                <div style={styleCrd}>
                  <h4 style={{ marginTop: 0, marginBottom: '25px', fontWeight: '900' }}>🆕 Subir Nuevo Producto</h4>
                  <form onSubmit={handleAddProductoBJ} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <input placeholder="Nombre Modelo" value={formProd.nombre} onChange={e => setFormProd({...formProd, nombre: e.target.value})} style={styleInp} />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                        <input placeholder="Costo Compra" value={formProd.precio_compra} onChange={e => setFormProd({...formProd, precio_compra: handleInputMonto(e.target.value)})} style={styleInp} />
                        <input placeholder="Venta Mayor" value={formProd.precio_venta} onChange={e => setFormProd({...formProd, precio_venta: handleInputMonto(e.target.value)})} style={styleInp} />
                    </div>
                    <input placeholder="Stock Inicial" value={formProd.stock} onChange={e => setFormProd({...formProd, stock: e.target.value})} style={styleInp} />
                    <button type="submit" style={{ backgroundColor: OSCURO_BJ, color: '#fff', border: 'none', padding: '18px', borderRadius: '18px', fontWeight: '900', cursor:'pointer' }}>CREAR PRODUCTO</button>
                  </form>
                </div>
            </div>

            {/* LIBRO DIARIO */}
            <div style={styleCrd}>
                <h4 style={{ marginTop: 0, marginBottom: '30px', fontWeight: '900', fontSize: '1.4rem' }}>📖 Libro Diario de Operaciones BJ</h4>
                <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                    <table style={{ width: '100%', fontSize: '14px', borderCollapse: 'collapse' }}>
                        <thead style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
                            <tr style={{ borderBottom: '2px solid #f1f1f1' }}>
                                <th style={{ textAlign: 'left', padding: '15px' }}>DETALLE / TIPO</th>
                                <th style={{ textAlign: 'right', padding: '15px' }}>BOLSA</th>
                                <th style={{ textAlign: 'right', padding: '15px' }}>MONTO</th>
                            </tr>
                        </thead>
                        <tbody>
                        {finanzas.map(f => (
                            <tr key={f.id} style={{ borderBottom: '1px solid #f1f1f1' }}>
                                <td style={{ padding: '20px 15px' }}>
                                    <small style={{fontWeight:'900', color:'#64748B', display:'block'}}>{getFechaPeru(f.created_at)} | {getHoraPeru(f.created_at)}</small>
                                    <small style={{fontWeight:'900', color:FUCSIA_PRINCIPAL, textTransform:'uppercase'}}>{f.tipo}</small>
                                    <br/><span style={{ fontWeight: '600', fontSize:'15px' }}>{f.descripcion}</span>
                                </td>
                                <td style={{ textAlign: 'right', padding: '20px 15px' }}>
                                    <span style={{backgroundColor: f.origen === 'Ganancias' ? `${FUCSIA_PRINCIPAL}15` : '#F1F5F9', color: f.origen === 'Ganancias' ? FUCSIA_PRINCIPAL : '#64748B', padding:'5px 12px', borderRadius:'10px', fontWeight:'900', fontSize:'11px'}}>
                                        {f.origen?.toUpperCase()}
                                    </span>
                                </td>
                                <td style={{ textAlign: 'right', padding: '20px 15px', fontWeight: '900', fontSize: '18px', color: (['Ingreso Adicional','Inversión Inicial'].includes(f.tipo)) ? VERDE_BJ : OSCURO_BJ }}>
                                    {(['Ingreso Adicional','Inversión Inicial'].includes(f.tipo)) ? '+' : '-'} S/ {(Number(f.monto) || 0).toFixed(2)}
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}