"use client";
/**
 * ============================================================================
 * SISTEMA: MASTER BÚNKER BJ - VERSIÓN EXTENDIDA Y BLINDADA (v6.0.0)
 * PROPIETARIO: Jean - B J Importaciones Chiclayo
 * * CORRECCIONES APLICADAS:
 * 1. DESCOMPRESIÓN TOTAL: Ninguna función está en una sola línea.
 * 2. UI LIMPIA: Se retiraron las métricas financieras de la cabecera general.
 * 3. NAVEGACIÓN: Restaurada la barra de navegación original.
 * 4. LÓGICA: Se mantienen los diferenciales con Number() y el rastro forense.
 * ============================================================================
 */
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from './supabaseClient';
import { getFechaPeru, handleInputMonto, getHoraPeru } from '../lib/helpers';

import VentasSection from '../components/Ventas';
import AlmacenSection from '../components/Almacen';
import LogisticaSection from '../components/Logistica';
import GestionSection from '../components/Gestion';
import FinanzasSection from '../components/Finanzas';
import ClientesSection from '../components/Clientes';
// 1. INYECCIÓN DE FUENTE PREMIUM
if (typeof window !== 'undefined') {
  const link = document.createElement('link');
  link.href = 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;900&display=swap';
  link.rel = 'stylesheet';
  document.head.appendChild(link);
}
// INYECCIÓN DE ESTILOS GLOBALES (Ocultar Scrollbars)
if (typeof window !== 'undefined') {
  const style = document.createElement('style');
  style.innerHTML = `
    /* Ocultar barra de desplazamiento para Chrome, Safari y Opera */
    *::-webkit-scrollbar {
      display: none;
    }
    /* Ocultar barra de desplazamiento para IE, Edge y Firefox */
    * {
      -ms-overflow-style: none;  /* IE and Edge */
      scrollbar-width: none;  /* Firefox */
    }
  `;
  document.head.appendChild(style);
}
export default function SistemaBJCMasterFinal() {
  
  // ==========================================
  // 1. ESTADOS DE BASE DE DATOS
  // ==========================================
  const [hasMounted, setHasMounted] = useState(false);
  const [productos, setProductos] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [finanzas, setFinanzas] = useState([]);
  const [auditoriaLogs, setAuditoriaLogs] = useState([]); 
  const [cargando, setCargando] = useState(true);

  // ==========================================
  // 2. ESTADOS OPERATIVOS (PUNTO DE VENTA)
  // ==========================================
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

  // ==========================================
  // 3. ESTADOS DE FORMULARIOS MULTI-PESTAÑA
  // ==========================================
  const [formProd, setFormProd] = useState({ 
      nombre: '', precio_compra: '', precio_venta: '', precio_menor: '', stock: '', colores: '' 
  });
  const [formFinanzas, setFormFinanzas] = useState({ 
      tipo: 'Gasto Local', descripcion: '', monto: '' 
  });
  const [idEditFinanza, setIdEditFinanza] = useState(null);
  const [formEditFinanza, setFormEditFinanza] = useState({});

  const [idEditProducto, setIdEditProducto] = useState(null);
  const [formEditProducto, setFormEditProducto] = useState({});
  const [formEditStockBJ, setFormEditStockBJ] = useState({});

  // ==========================================
  // 4. SISTEMA DE SEGURIDAD BÚNKER
  // ==========================================
  const PIN_MAESTRO = "232310"; 
  const [accesoConcedido, setAccesoConcedido] = useState(false);
  const [pinIngresado, setPinIngresado] = useState('');
  const [errorPin, setErrorPin] = useState(false);

  // ==========================================
  // 5. ESTILOS VISUALES
  // ==========================================
  const FUCSIA_PRINCIPAL = '#F01097';
  const VERDE_BJ = '#16A34A';
  const ROJO_BJ = '#E11D48';
  const AMARILLO_BJ = '#CA8A04';
  const OSCURO_BJ = '#1E1B1C';

  const styleInp = { 
      padding: '16px', 
      borderRadius: '16px', 
      border: 'none', /* Eliminamos el borde rosado */
      backgroundColor: '#F1F5F9', /* Fondo gris ultraclaro */
      width: '100%', 
      outline: 'none', 
      fontSize: '14px', 
      fontWeight: '600',
      color: OSCURO_BJ,
      boxSizing: 'border-box', 
      transition: 'all 0.3s ease' 
  };
  
  const styleCrd = { 
      background: 'linear-gradient(145deg, #ffffff, #fffcfd)', // Micro-degradado
      borderRadius: '32px', 
      padding: '28px', 
      boxShadow: '0 20px 40px rgba(240, 16, 151, 0.06), 0 1px 4px rgba(0,0,0,0.02)', // Sombra flotante
      border: '1px solid rgba(255, 255, 255, 0.7)', // Brillo en el borde
      boxSizing: 'border-box', 
      overflow: 'hidden',
      fontFamily: "'Poppins', sans-serif" // Aplicamos la nueva letra
  };

  // ==========================================
  // 6. CARGA DE DATOS Y SINCRONIZACIÓN
  // ==========================================
  useEffect(() => { 
    setHasMounted(true); 
    const sesion = localStorage.getItem('bj_bunker_auth');
    if (sesion === 'acceso_total') {
        setAccesoConcedido(true);
        cargarTodoDesdeNube();
    } else { 
        setCargando(false); 
    }
  }, []);

  const cargarTodoDesdeNube = async () => {
    try {
        const { data: p } = await supabase.from('productos').select('*').order('created_at', { ascending: false });
        const { data: v } = await supabase.from('ventas').select('*').order('created_at', { ascending: true });
        const { data: f } = await supabase.from('finanzas').select('*').order('created_at', { ascending: false });
        const { data: a } = await supabase.from('auditoria_bj').select('*').order('created_at', { ascending: true });
        
        if (p) setProductos(p); 
        if (v) setVentas(v); 
        if (f) setFinanzas(f); 
        if (a) setAuditoriaLogs(a);
    } catch (e) { 
        console.error("Error BJ Sync:", e); 
    } finally { 
        setCargando(false); 
    }
  };

  const intentarAcceso = (e) => {
    e.preventDefault();
    if (pinIngresado === PIN_MAESTRO) {
        localStorage.setItem('bj_bunker_auth', 'acceso_total');
        setAccesoConcedido(true);
        setErrorPin(false);
        setCargando(true);
        cargarTodoDesdeNube();
    } else { 
        setErrorPin(true); 
        setPinIngresado(''); 
    }
  };

  const cerrarSesion = () => {
    if(confirm("¿Bloquear el Búnker y cerrar sesión?")) {
        localStorage.removeItem('bj_bunker_auth');
        setAccesoConcedido(false);
        setPinIngresado('');
    }
  };

  // ==========================================
  // 7. MOTOR MATEMÁTICO FORENSE
  // ==========================================
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
    const mesActual = hoyS.substring(0, 7); // NUEVO: Extrae el mes actual (Ej: "2026-04")
    // CAJA REAL
    const ventasCompletadas = ventas
        .filter(v => v.estado_pedido === 'Entregado' || v.estado_pedido === 'En Almacén')
        .reduce((acc, v) => acc + (Number(v.precio_venta_unitario) * Number(v.cantidad)), 0);
        
    const ingresosAdmin = finanzas
        .filter(f => ['Ingreso Adicional', 'Inversión Inicial'].includes(f.tipo))
        .reduce((acc, f) => acc + Number(f.monto), 0);
        
    const gastosTotales = finanzas
        .filter(f => !['Ingreso Adicional', 'Inversión Inicial'].includes(f.tipo))
        .reduce((acc, f) => acc + Number(f.monto), 0);
        
    const cajaReal = (ventasCompletadas + ingresosAdmin) - gastosTotales;

    // MÉTRICAS DEL DÍA
    const cajaHoy = ventas
        .filter(v => getFechaPeru(v.created_at) === hoyS && v.estado_pedido !== 'Pendiente de Pago' && v.estado_pedido !== 'Anulado')
        .reduce((acc, v) => acc + (Number(v.precio_venta_unitario)*Number(v.cantidad)), 0);
        
    const gananciaHoy = ventas
        .filter(v => getFechaPeru(v.created_at) === hoyS && v.estado_pedido !== 'Anulado')
        .reduce((acc, v) => acc + Number(v.ganancia_total || 0), 0);
        
    const utilidadHistorica = ventas
        .filter(v => v.estado_pedido !== 'Anulado')
        .reduce((acc, v) => acc + Number(v.ganancia_total || 0), 0);

       const gananciaMes = ventas
        .filter(v => getFechaPeru(v.created_at).substring(0,7) === mesActual && v.estado_pedido !== 'Anulado')
        .reduce((acc, v) => acc + Number(v.ganancia_total || 0), 0);
        
    const gastosMes = finanzas
        .filter(f => getFechaPeru(f.created_at).substring(0,7) === mesActual && ['Gasto Local','Retiro Personal'].includes(f.tipo))
        .reduce((acc, f) => acc + Number(f.monto), 0);
        
    const porcentajeEquilibrio = gastosMes > 0 ? (gananciaMes / gastosMes) * 100 : (gananciaMes > 0 ? 100 : 0);
    return { 
        cH: cajaHoy, 
        gH: gananciaHoy, 
        cG: cajaReal, 
        bR: utilidadHistorica,
        pe_g: gananciaMes,
        pe_m: gastosMes,
        pe_p: porcentajeEquilibrio > 100 ? 100 : porcentajeEquilibrio };
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
        const it = { 
            id: v.id, producto_id: v.producto_id, nombre: pM?.nombre, 
            cantidad: v.cantidad, color: v.color, 
            subtotal: (Number(v.precio_venta_unitario) * Number(v.cantidad)), 
            precio: v.precio_venta_unitario 
        };
        
        if (v.estado_pedido === 'En Almacén') { 
            if(!mA[key]) mA[key]={cliente:v.cliente_nombre, localidad:v.localidad, items:[], items_ids:[], total:0}; 
            mA[key].items.push(it); mA[key].items_ids.push(v.id); mA[key].total += it.subtotal; 
        }
        if (v.estado_pedido === 'Pendiente de Pago') { 
            if(!mD[key]) mD[key]={cliente:v.cliente_nombre, localidad:v.localidad, items:[], items_ids:[], total:0}; 
            mD[key].items.push(it); mD[key].items_ids.push(v.id); mD[key].total += it.subtotal; 
        }
    });
    return { almacen: Object.values(mA), deudas: Object.values(mD) };
  }, [ventas, productos]);

  const historialVentasDiaBJ = useMemo(() => {
    const filt = ventas.filter(v => 
        getFechaPeru(v.created_at) === fechaConsulta && 
        v.cliente_nombre?.toLowerCase().includes(busquedaHistorial.toLowerCase()) &&
        v.estado_pedido !== 'Anulado' // 👈 ESTE ES EL ESCUDO QUE FALTABA
    );
    const groups = {};
    filt.forEach(v => {
        const hId = `${v.cliente_nombre}-${v.created_at?.substring(0,16)}`; 
        if (!groups[hId]) {
            groups[hId] = { 
                id_grupo: hId, cliente_nombre: v.cliente_nombre, localidad: v.localidad, 
                telefono: v.telefono, hora: getHoraPeru(v.created_at), total: 0, items: [] 
            };
        }
        groups[hId].items.push(v); 
        groups[hId].total += (Number(v.precio_venta_unitario) * Number(v.cantidad));
    });
    return Object.values(groups).reverse();
  }, [ventas, fechaConsulta, busquedaHistorial]);

  // ==========================================
  // 8. FUNCIONES: CRM Y VENTAS (PUNTO DE VENTA)
  // ==========================================
  const handleAutocompleteClienteBJ = (e) => {
    const val = e.target.value; 
    setCliente(val);
    const clienteFrecuente = ventas.find(v => v.cliente_nombre?.toLowerCase() === val.toLowerCase());
    if (clienteFrecuente) { 
        setLocalidad(clienteFrecuente.localidad || 'Chiclayo'); 
        setTelefono(clienteFrecuente.telefono || ''); 
    }
  };

  const handleEjecutarVentaBJ = async (estado) => {
    if (!cliente || carrito.length === 0) {
        return alert("Faltan datos del cliente o el carrito está vacío.");
    }
    
    const snap = balanceEliteBJ.cG;
    const totalVenta = carrito.reduce((acc, i) => acc + (Number(i.precio_venta) * Number(i.cantidad)), 0);
    const montoHoy = (estado === 'Entregado' || estado === 'En Almacén') ? (totalVenta - Number(descuento)) : Number(efectivoRecibido);
    const ts = new Date().toISOString();

    const lista = carrito.map(i => ({ 
        cliente_nombre: cliente, 
        localidad: localidad, 
        telefono: telefono, 
        producto_id: i.producto_id, 
        cantidad: Number(i.cantidad), 
        color: i.color, 
        precio_venta_unitario: Number(i.precio_venta), 
        precio_costo_unitario: Number(i.precio_compra), 
        ganancia_total: (Number(i.precio_venta) - Number(i.precio_compra)) * Number(i.cantidad), 
        estado_pedido: estado, 
        created_at: ts 
    }));

    const { error } = await supabase.from('ventas').insert(lista);
    
    if (!error) {
        if (montoHoy > 0) {
            await supabase.from('auditoria_bj').insert([{ 
                cliente: cliente, 
                operacion: estado === 'Pendiente de Pago' ? 'ABONO CRÉDITO' : 'COBRO VENTA', 
                monto_operacion: montoHoy, 
                caja_antes: snap, 
                caja_despues: snap + montoHoy 
            }]);
        }
        
        for (const it of carrito) {
            const prodStock = productos.find(p => p.id === it.producto_id);
            if (prodStock) {
                await supabase.from('productos').update({ stock: Number(prodStock.stock) - Number(it.cantidad) }).eq('id', it.producto_id);
            }
        }
        
        // Limpieza de estados tras venta exitosa
        setCarrito([]); 
        setEfectivoRecibido(''); 
        setCliente('Tienda'); 
        setLocalidad('Chiclayo'); 
        setTelefono(''); 
        setDescuento(0);
        cargarTodoDesdeNube();
    } else { 
        alert("Error de conexión al búnker."); 
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
        
        // Actualizar el ítem en la base de datos
        await supabase.from('ventas').update({ 
            cantidad: Number(data.cantidad), 
            precio_venta_unitario: Number(data.precio_venta_unitario), 
            ganancia_total: nuevaGanancia 
        }).eq('id', id);

        // Registro forense si hubo impacto en caja (solo ventas no a crédito)
        if (itemOriginal.estado_pedido !== 'Pendiente de Pago' && diffCaja !== 0) {
            await supabase.from('auditoria_bj').insert([{ 
                cliente: itemOriginal.cliente_nombre, 
                operacion: 'CORRECCIÓN DE HISTORIAL', 
                detalles: `Cant: ${itemOriginal.cantidad}->${data.cantidad} | S/: ${itemOriginal.precio_venta_unitario}->${data.precio_venta_unitario}`, 
                monto_operacion: -diffCaja, 
                caja_antes: snap, 
                caja_despues: snap - diffCaja 
            }]);
        }
        
        // Devolución o resta de stock si cambió la cantidad
        if (pO && diffCant !== 0) {
            await supabase.from('productos').update({ stock: Number(pO.stock) + diffCant }).eq('id', pO.id);
        }
        cargarTodoDesdeNube();
    } catch (e) { 
        console.error("Error en update individual:", e); 
    }
  };

  const handleAnularVentaBJ = async (v) => {
    if (confirm("¿Anular este ítem por completo y devolver el stock?")) {
        const snap = balanceEliteBJ.cG;
        const pO = productos.find(p => p.id === v.producto_id);
        
        // 1. Devolver Stock
        if (pO) {
            await supabase.from('productos').update({ stock: Number(pO.stock) + Number(v.cantidad) }).eq('id', pO.id);
        }
        
        // 2. Revertir dinero si no era a crédito
        if (v.estado_pedido !== 'Pendiente de Pago') {
            const dineroADevolver = Number(v.precio_venta_unitario) * Number(v.cantidad);
            await supabase.from('auditoria_bj').insert([{ 
                cliente: v.cliente_nombre, 
                operacion: 'DEVOLUCIÓN DE ÍTEM', 
                monto_operacion: -dineroADevolver, 
                caja_antes: snap, 
                caja_despues: snap - dineroADevolver 
            }]);
        }
        
        // 3. Borrado suave (marcar como anulado para no romper métricas pasadas)
        await supabase.from('ventas').update({ estado_pedido: 'Anulado' }).eq('id', v.id);
        cargarTodoDesdeNube();
    }
  };

  const handleExportarExcelCajaFull = () => {
    let csv = "\uFEFFCLIENTE,HORA,TOTAL\n";
    historialVentasDiaBJ.forEach(g => { 
        csv += `${g.cliente_nombre},${g.hora},${g.total}\n`; 
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a"); 
    link.href = URL.createObjectURL(blob); 
    link.setAttribute("download", `BJ_Forense_${fechaConsulta}.csv`); 
    link.click();
  };

  // ==========================================
  // 9. FUNCIONES: STOCK (ALMACÉN)
  // ==========================================
  const handleAddProductoBJ = async (e) => { 
      e.preventDefault(); 
      await supabase.from('productos').insert([formProd]); 
      setFormProd({nombre:'', precio_compra:'', precio_venta:'', precio_menor:'', stock:'', colores:''}); 
      cargarTodoDesdeNube(); 
  };
  
  const handleUpdateProductoBJ = async (id) => { 
      await supabase.from('productos').update(formEditProducto).eq('id',id); 
      setIdEditProducto(null); 
      cargarTodoDesdeNube(); 
  };
  
  const handleDeleteProductoBJ = async (id, n) => { 
      if(confirm(`¿Estás seguro de eliminar el modelo ${n} del sistema?`)) { 
          await supabase.from('productos').delete().eq('id',id); 
          cargarTodoDesdeNube(); 
      } 
  };
  
  const handleSincronizarStockBJ = async (id, s) => { 
      await supabase.from('productos').update({stock: Number(s)}).eq('id',id); 
      cargarTodoDesdeNube(); 
  };

  // ==========================================
  // 10. FUNCIONES: LOGÍSTICA (COBRANZAS)
  // ==========================================
  const handleCobrarDeudaBJ = async (g, m) => { 
      const pre = balanceEliteBJ.cG; 
      
      // Pasar todos los ítems de este grupo a "Entregado"
      for(let id of g.items_ids) {
          await supabase.from('ventas').update({estado_pedido:'Entregado'}).eq('id',id);
      } 
      
      // Registrar ingreso de dinero a la caja global si hubo abono
      if(Number(m) > 0) {
          await supabase.from('auditoria_bj').insert([{
              cliente: g.cliente,
              operacion: 'COBRO SALDO CREDITO',
              monto_operacion: Number(m),
              caja_antes: pre,
              caja_despues: pre + Number(m)
          }]);
      } 
      cargarTodoDesdeNube(); 
  };
  
  const handleAnularCreditoBJ = async (g) => { 
      // Devolver stock de todos los ítems de la deuda
      for(const it of g.items) {
          const pO = productos.find(p => p.id === it.producto_id); 
          if(pO) {
              await supabase.from('productos').update({stock: Number(pO.stock) + Number(it.cantidad)}).eq('id',pO.id);
          }
      } 
      // Eliminar el registro del crédito
      await supabase.from('ventas').delete().in('id', g.items_ids); 
      cargarTodoDesdeNube(); 
  };

  // ==========================================
  // 11. FUNCIONES: FINANZAS (GASTOS E INGRESOS)
  // ==========================================
  
  // 1. FUNCIÓN PARA EDITAR (Afuera e independiente)
  const handleUpdateFinanzaBJ = async (id) => { 
      await supabase.from('finanzas').update(formEditFinanza).eq('id', id); 
      setIdEditFinanza(null); 
      cargarTodoDesdeNube(); 
  };

  // 2. FUNCIÓN PARA REGISTRAR NUEVO (Limpia)
  const handleRegistrarFinanzaBJ = async (e) => {
      e.preventDefault();
      
      const mF = Number(handleInputMonto(formFinanzas.monto));
      const esGasto = !['Ingreso Adicional', 'Inversión Inicial'].includes(formFinanzas.tipo);
      const delta = esGasto ? -mF : mF; // Negativo si sale dinero
      
      const { error } = await supabase.from('finanzas').insert([{ ...formFinanzas, monto: mF }]);
      
      if (!error) {
          await supabase.from('auditoria_bj').insert([{ 
              cliente: 'ADMINISTRATIVO', 
              operacion: formFinanzas.tipo.toUpperCase(), 
              monto_operacion: delta, 
              caja_antes: balanceEliteBJ.cG, 
              caja_despues: balanceEliteBJ.cG + delta 
          }]);
          setFormFinanzas({ tipo: 'Gasto Local', descripcion: '', monto: '' });
          cargarTodoDesdeNube(); 
      }
  };
  // ==========================================
  // 12. RENDERIZADO VISUAL DEL BÚNKER
  // ==========================================
  if (!hasMounted) return null;
  
  if (!accesoConcedido) {
    return (
        <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: OSCURO_BJ }}>
            <div style={{ ...styleCrd, backgroundColor: '#ffffff10', textAlign: 'center', maxWidth: '350px', width: '90%' }}>
                <h2 style={{ color: '#fff', fontWeight: '900' }}>BÚNKER PRIVADO BJ</h2>
                <form onSubmit={intentarAcceso} style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
                    <input 
                        type="password" 
                        value={pinIngresado} 
                        onChange={(e) => setPinIngresado(e.target.value)} 
                        placeholder="CÓDIGO PIN" 
                        style={{...styleInp, textAlign: 'center', fontSize: '24px'}} 
                    />
                    <button type="submit" style={{ backgroundColor: FUCSIA_PRINCIPAL, color: '#fff', border: 'none', padding: '18px', borderRadius: '15px', fontWeight: '900', cursor: 'pointer' }}>
                        DESBLOQUEAR 🔓
                    </button>
                </form>
            </div>
        </div>
    );
  }

  if (cargando) return <div style={{ height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', color:FUCSIA_PRINCIPAL, fontWeight:'900' }}>CARGANDO BÚNKER... 🚀</div>;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FFF5F7', color: OSCURO_BJ, paddingBottom: '100px', fontFamily: "'Poppins', system-ui, sans-serif" }}>
    
      
      {/* HEADER LIMPIO (ESTILO ORIGINAL) */}
      <header style={{ backgroundColor: '#ffffff', padding: '10px 5%', position: 'sticky', top: 0, zIndex: 1000, boxShadow: `0 4px 15px rgba(0,0,0,0.06)` }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ backgroundColor: FUCSIA_PRINCIPAL, color: '#fff', width: '38px', height: '38px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '14px' }}>BJ</div>
              <h1 style={{ margin: 0, fontSize: '0.9rem', fontWeight: '900', color: FUCSIA_PRINCIPAL }}>BJ IMPORTACIONES</h1>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <small style={{ fontSize: '10px', fontWeight: '900', opacity: 0.4 }}>BÚNKER EXTENDIDO v6.0</small>
                <button onClick={cerrarSesion} style={{ backgroundColor: '#FEF2F2', color: ROJO_BJ, border: `1px solid ${ROJO_BJ}50`, padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', fontWeight: '900', fontSize: '11px' }}>
                    BLOQUEAR 🔒
                </button>
            </div>
          </div>
          
          <nav style={{ display: 'flex', gap: '5px', overflowX: 'auto', paddingBottom: '5px', WebkitOverflowScrolling: 'touch' }}>
            {['ventas', 'stock', 'logistica', 'finanzas', 'clientes', 'contabilidad'].map(t => (
              <button 
                key={t} 
                onClick={() => setVista(t)} 
                style={{ 
                    flex: '0 0 auto', 
                    backgroundColor: vista === t ? FUCSIA_PRINCIPAL : '#FCA5D415', 
                    border: 'none', 
                    color: vista === t ? '#fff' : FUCSIA_PRINCIPAL, 
                    padding: '12px 18px', 
                    borderRadius: '12px', 
                    cursor: 'pointer', 
                    fontWeight: '900', 
                    fontSize: '11px' 
                }}
              >
                {t === 'contabilidad' ? 'GESTIÓN' : (t === 'clientes' ? 'CRM' : t.toUpperCase())}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* RENDERIZADO DE PESTAÑAS (COMPLETAMENTE CONECTADAS) */}
      <main style={{ maxWidth: '1400px', margin: '25px auto', padding: '0 20px' }}>
        
        {vista === 'ventas' && (
            <VentasSection {...{ 
                balanceEliteBJ, handleUpdateItemVentaBJ, fechaConsulta, setFechaConsulta, 
                efectivoRecibido, setEfectivoRecibido, handleExportarExcelCajaFull, 
                tipoVenta, setTipoVenta, cliente, handleAutocompleteCliente: handleAutocompleteClienteBJ, 
                ventas, localidad, setLocalidad, telefono, setTelefono, carrito, setCarrito, 
                descuento, setDescuento, handleEjecutarVentaBJ, busqueda, setBusqueda, 
                productos, coloresElegidos, setColoresElegidos, cantidades, setCantidades, 
                busquedaHistorial, setBusquedaHistorial, historialVentasDiaBJ, handleAnularVentaBJ, 
                analiticaProBJ, FUCSIA_PRINCIPAL, VERDE_BJ, ROJO_BJ, AMARILLO_BJ, OSCURO_BJ, styleInp, styleCrd 
            }} />
        )}
        
        {vista === 'stock' && (
            <AlmacenSection {...{ 
                formProd, setFormProd, handleAddProductoBJ,productos, 
                busquedaStock, setBusquedaStock, 
                idEditProducto, setIdEditProducto, formEditProducto, setFormEditProducto, 
                handleUpdateProductoBJ, handleDeleteProductoBJ, formEditStockBJ, 
                setFormEditStockBJ, handleSincronizarStockBJ, 
                FUCSIA_PRINCIPAL, VERDE_BJ, ROJO_BJ, OSCURO_BJ, styleInp, styleCrd 
            }} />
        )}
        
        {vista === 'logistica' && (
            <LogisticaSection {...{ 
                logisticaInteligente, handleCobrarDeudaBJ, handleAnularCreditoBJ, 
                handleEliminarItemIndividualLogistica: handleAnularVentaBJ, productos, finanzas, 
                FUCSIA_PRINCIPAL, VERDE_BJ, AMARILLO_BJ, ROJO_BJ, OSCURO_BJ, styleCrd, styleInp 
            }} />
        )}

        {vista === 'finanzas' && (
            <FinanzasSection {...{ 
                ventas, productos, finanzas, balanceEliteBJ, 
                FUCSIA_PRINCIPAL, VERDE_BJ, ROJO_BJ, AMARILLO_BJ, OSCURO_BJ, styleInp, styleCrd 
            }} />
        )}

        {vista === 'clientes' && (
            <ClientesSection {...{ 
                ventas, FUCSIA_PRINCIPAL, VERDE_BJ, OSCURO_BJ, styleCrd, styleInp 
            }} />
        )}

        {vista === 'contabilidad' && (
            <GestionSection {...{ 
                balanceEliteBJ, valorizacionStockBJ, analiticaProBJ, finanzas, 
                auditoriaLogs, handleRegistrarFinanzaBJ, 
                formFinanzas, setFormFinanzas, idEditFinanza, setIdEditFinanza, formEditFinanza, setFormEditFinanza, handleUpdateFinanzaBJ,
                FUCSIA_PRINCIPAL, VERDE_BJ, ROJO_BJ, AMARILLO_BJ, OSCURO_BJ, styleInp, styleCrd 
            }} />
        )}

      </main>
    </div>
  );
}