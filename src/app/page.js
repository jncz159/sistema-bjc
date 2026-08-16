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
  const style = document.createElement('style');
  style.innerHTML = `
    /* 1. TIPOGRAFÍA PREMIUM JAKARTA */
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;800&display=swap');

    body { 
      font-family: 'Plus Jakarta Sans', sans-serif; 
      background-color: #f8fafc; 
      color: #0f172a;
      margin: 0;
      -webkit-font-smoothing: antialiased;
    }

    /* 2. OCULTAR SCROLLBARS */
    *::-webkit-scrollbar { display: none; }
    * { -ms-overflow-style: none; scrollbar-width: none; }

    /* 3. CLASES VISUALES PRO */
    .glass-card {
      background: rgba(255, 255, 255, 0.8);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.5);
      box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.05);
      border-radius: 28px;
      transition: all 0.3s ease;
    }

    .skeleton { 
      animation: pulse 1.5s ease-in-out infinite; 
      background: #e2e8f0; 
      border-radius: 16px; 
    }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .4; } }

    /* 4. AJUSTE MÓVIL CHICLAYO */
    @media (max-width: 768px) {
      .header-desktop { display: none !important; }
      .nav-mobile { 
        display: flex !important; position: fixed; bottom: 0; left: 0; right: 0; 
        background: rgba(255,255,255,0.9); backdrop-filter: blur(10px);
        height: 75px; z-index: 10000; justify-content: space-around; align-items: center;
        padding-bottom: env(safe-area-inset-bottom); border-radius: 25px 25px 0 0;
        box-shadow: 0 -5px 25px rgba(0,0,0,0.05);
      }
      main { padding: 0 10px 100px 10px !important; }
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
const [movimientosStock, setMovimientosStock] = useState([]); // 👈 Nuevo: Para ver las recargas
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
        // ✅ Ventas y Auditoría con lo más reciente arriba
        const { data: v } = await supabase.from('ventas').select('*').order('created_at', { ascending: false }); 
        const { data: f } = await supabase.from('finanzas').select('*').order('created_at', { ascending: false });
        const { data: a } = await supabase.from('auditoria_bj').select('*').order('created_at', { ascending: false }); 
        const { data: m } = await supabase.from('movimientos_stock_bj').select('*').order('created_at', { ascending: false });

        if (m) setMovimientosStock(m);
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
  
const resumenGastosBJ = useMemo(() => {
    // 🚀 Agregamos 'mercaderia' al objeto inicial
    const totales = { local: 0, logistica: 0, ads: 0, adicional: 0, personal: 0, mercaderia: 0 };
    
    finanzas.forEach(f => {
      const t = f.tipo?.toLowerCase() || "";
      const d = f.descripcion?.toUpperCase() || "";
      const m = Number(f.monto || 0);

      // 🔍 Lógica de clasificación
      if (t.includes('mercadería') || t.includes('compra')) totales.mercaderia += m;
      else if (t.includes('local')) totales.local += m;
      else if (t.includes('logística')) totales.logistica += m;
      else if (t.includes('marketing') || t.includes('ads')) totales.ads += m;
      else if (t.includes('ingreso') || t.includes('adicional')) totales.adicional += m;
      else if (t.includes('personal') && !d.includes('CUADRE')) totales.personal += m;
    });
    
    return totales;
  }, [finanzas]);
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
    const mesActual = hoyS.substring(0, 7);

    // 🛡️ ANCLA DE REALIDAD BLINDADA: Saldo tomado directo del último log inmutable
    const ultimoLog = auditoriaLogs[0];
    const cajaVivaReal = ultimoLog ? Number(ultimoLog.caja_despues || 0) : 0;

    // 🚀 SEPARACIÓN DE ARQUEO DIARIO FÍSICO VS DIGITAL
    const efectivoHoy = ventas
        .filter(v => getFechaPeru(v.created_at) === hoyS && v.estado_pedido !== 'Anulado')
        .reduce((acc, v) => acc + Number(v.monto_efectivo || 0), 0);

    const digitalHoy = ventas
        .filter(v => getFechaPeru(v.created_at) === hoyS && v.estado_pedido !== 'Anulado')
        .reduce((acc, v) => acc + Number(v.monto_yape || 0), 0);

    const cajaHoyExacta = efectivoHoy + digitalHoy;

    // 📊 METRICAS DEL MES (Punto de Equilibrio sin arrastrar históricos de 33K)
    const gastosOperativosMes = finanzas
        .filter(f => {
            const fFecha = getFechaPeru(f.created_at).substring(0,7);
            const t = f.tipo?.toLowerCase() || "";
            const d = f.descripcion?.toUpperCase() || "";
            return fFecha === mesActual && (t.includes('local') || t.includes('personal') || t.includes('logística') || t.includes('marketing')) && !t.includes('mercadería') && !d.includes('CUADRE');
        })
        .reduce((acc, f) => acc + Number(f.monto || 0), 0);

    const gananciaMes = ventas
        .filter(v => getFechaPeru(v.created_at).substring(0,7) === mesActual && v.estado_pedido !== 'Anulado')
        .reduce((acc, v) => acc + Number(v.ganancia_total || 0), 0);

    return { 
        cH: cajaHoyExacta, 
        cG: cajaVivaReal, 
        efectivoHoy: efectivoHoy, 
        digitalHoy: digitalHoy,  
        gH: ventas.filter(v => getFechaPeru(v.created_at) === hoyS && v.estado_pedido !== 'Anulado').reduce((acc, v) => acc + Number(v.ganancia_total || 0), 0),
        bR: ventas.filter(v => v.estado_pedido !== 'Anulado').reduce((acc, v) => acc + Number(v.ganancia_total || 0), 0),
        pe_g: gananciaMes, 
        pe_m: gastosOperativosMes, 
        pe_p: gastosOperativosMes > 0 ? Math.min((gananciaMes / gastosOperativosMes) * 100, 100) : (gananciaMes > 0 ? 100 : 0)
    };
  }, [ventas, finanzas, auditoriaLogs]);
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
            precio: v.precio_venta_unitario,
            // 👈 IMPORTANTE: Pasamos los valores de pago de cada ítem
            monto_efectivo: Number(v.monto_efectivo || 0),
            monto_yape: Number(v.monto_yape || 0),
            saldo_pendiente: Number(v.saldo_pendiente || 0)
        };
        
        if (v.estado_pedido === 'En Almacén') { 
            if(!mA[key]) mA[key]={cliente:v.cliente_nombre, localidad:v.localidad, items:[], items_ids:[], total:0}; 
            mA[key].items.push(it); mA[key].items_ids.push(v.id); mA[key].total += it.subtotal; 
        }
        if (v.estado_pedido === 'Pendiente de Pago') { 
            if(!mD[key]) mD[key]={cliente:v.cliente_nombre, localidad:v.localidad, items:[], items_ids:[], total:0, totalAbonado:0, totalPendiente:0}; 
            mD[key].items.push(it); 
            mD[key].items_ids.push(v.id); 
            mD[key].total += it.subtotal; // El valor total original de la venta
            mD[key].totalAbonado += (it.monto_efectivo + it.monto_yape); // Lo que ya entró a caja
            mD[key].totalPendiente += it.saldo_pendiente; // Lo que falta cobrar
        }
    });
    return { almacen: Object.values(mA), deudas: Object.values(mD) };
  }, [ventas, productos]);

 const historialVentasDiaBJ = useMemo(() => {
    const filt = ventas.filter(v => 
        getFechaPeru(v.created_at) === fechaConsulta && 
        v.cliente_nombre?.toLowerCase().includes(busquedaHistorial.toLowerCase()) &&
        v.estado_pedido !== 'Anulado'
    );
    
    const groups = {};
    
    filt.forEach(v => {
        const hId = `${v.cliente_nombre}-${v.created_at?.substring(0,16)}`; 
        if (!groups[hId]) {
            groups[hId] = { 
                id_grupo: hId, 
                cliente_nombre: v.cliente_nombre, 
                localidad: v.localidad || 'Chiclayo', 
                telefono: v.telefono, 
                hora: getHoraPeru(v.created_at), 
                created_at: v.created_at, 
                estado_pedido: v.estado_pedido,
                monto_efectivo: 0, 
                monto_yape: 0,     
                saldo_pendiente: 0,
                total: 0, 
                items: [] 
            };
        }
        groups[hId].items.push(v); 
        groups[hId].total += (Number(v.precio_venta_unitario) * Number(v.cantidad));
        
        // ✅ Suma el dinero de todos los ítems para activar las etiquetas moradas/verdes
        groups[hId].monto_efectivo += Number(v.monto_efectivo || 0);
        groups[hId].monto_yape += Number(v.monto_yape || 0);
        groups[hId].saldo_pendiente += Number(v.saldo_pendiente || 0);
    });

    // 🚀 Ordena siempre de más reciente a más antiguo
    return Object.values(groups).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
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

 const handleEjecutarVentaBJ = async (estado, desglose) => {
    if (!cliente || carrito.length === 0) return alert("Carrito vacío");

    const ts = new Date().toISOString();
    
    // 🛡️ CORRECCIÓN DE SALDO VIVO: Tomamos el saldo de la última fila escrita en la bitácora
    const ultimoLog = auditoriaLogs[0]; // Como viene ordenado desc, el [0] es el más reciente
    const preCaja = ultimoLog ? Number(ultimoLog.caja_despues || 0) : Number(balanceEliteBJ?.cG || 0);
    
    const montoRealEntrante = Number(desglose?.monto_efectivo || 0) + Number(desglose?.monto_yape || 0);
    const deudaVenta = Number(desglose?.saldo_pendiente || 0);

    // 🚀 MAPEO BLINDADO CON GENERACIÓN DE UUID (SOLUCIONA EL ERROR ANTERIOR)
    const listaVentas = carrito.map((i, index) => {
      const prodId = i.producto_id || i.id;
      const pVenta = Number(i.precio_venta ?? i.precio ?? 0);
      const pCosto = Number(i.precio_compra ?? i.costo ?? 0);
      const cant = Number(i.cantidad || 1);

      return {
        id: crypto.randomUUID(), // 🔑 SOLUCIÓN: Genera el UUID que exige la columna 'id' NOT NULL
        cliente_nombre: cliente,
        producto_id: prodId,
        cantidad: cant,
        color: i.color || '',
        precio_venta_unitario: pVenta,
        precio_costo_unitario: pCosto,
        ganancia_total: (pVenta - pCosto) * cant,
        estado_pedido: estado,
        localidad: localidad,
        created_at: ts,
        monto_efectivo: index === 0 ? Number(desglose?.monto_efectivo || 0) : 0,
        monto_yape: index === 0 ? Number(desglose?.monto_yape || 0) : 0,
        saldo_pendiente: index === 0 ? deudaVenta : 0
      };
    });

    try {
      // 1. Guardar la venta en Supabase
      const { error: errorVenta } = await supabase.from('ventas').insert(listaVentas);
      if (errorVenta) throw errorVenta;

      // 2. 🚀 REGISTRO EN BITÁCORA CON SALDO CONSECUTIVO BLINDADO
      const { error: errorLog } = await supabase.from('auditoria_bj').insert([{
        id: crypto.randomUUID(), // Blindaje de ID también en auditoría
        cliente: cliente,
        operacion: estado === 'Pendiente de Pago' ? 'CRÉDITO INICIADO' : 'VENTA CONTADO',
        detalles: `RECIBIDO: S/ ${montoRealEntrante.toFixed(2)} | DEUDA: S/ ${deudaVenta.toFixed(2)}`,
        monto_operacion: montoRealEntrante,
        caja_antes: preCaja,
        caja_despues: preCaja + montoRealEntrante // Flujo limpio correlativo
      }]);
      
      if (errorLog) throw errorLog;

      // 3. Actualización de stock inteligente
      const resumenStock = {};
      carrito.forEach(item => {
        const pId = item.producto_id || item.id;
        resumenStock[pId] = (resumenStock[pId] || 0) + Number(item.cantidad || 1);
      });

      for (const [id, cantTotal] of Object.entries(resumenStock)) {
        const p = productos.find(prod => String(prod.id) === String(id));
        if (p) {
          await supabase.from('productos').update({ 
            stock: Number(p.stock) - cantTotal 
          }).eq('id', id);
        }
      }

      setCarrito([]); 
      setCliente('Tienda');
      await cargarTodoDesdeNube();
      return true;
    } catch (e) {
      alert("❌ Error crítico en el búnker: " + e.message);
      return false;
    }
};
  }; // ✅ ESTA LLAVE CIERRA handleEjecutarVentaBJ CORRECTAMENTE
  const handleUpdateItemVentaBJ = async (id, data) => {
    try {
        const { data: itemOriginal } = await supabase.from('ventas').select('*').eq('id', id).single();
        if (!itemOriginal) return;

        const pO = productos.find(p => String(p.id) === String(itemOriginal.producto_id));
        
        // 🛡️ CORRECCIÓN: Tomar el saldo vivo real de la bitácora para calcular el diferencial
        const ultimoLog = auditoriaLogs[0];
        const snap = ultimoLog ? Number(ultimoLog.caja_despues || 0) : Number(balanceEliteBJ.cG || 0);

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
        
        if (pO && diffCant !== 0) {
            await supabase.from('productos').update({ stock: Number(pO.stock) + diffCant }).eq('id', pO.id);
        }
        await cargarTodoDesdeNube();
    } catch (e) { 
        console.error("Error en update individual:", e); 
    }
  };
const handleAnularVentaBJ = async (ventaOriginal) => {
    if (ventaOriginal.estado_pedido === 'Anulado') return;
    if (!confirm(`¿Anular venta de ${ventaOriginal.cliente_nombre}? Restaurará stock y caja.`)) return;

    // 🛡️ CORRECCIÓN: Saldo tomado estrictamente de la última fila escrita
    const ultimoLog = auditoriaLogs[0];
    const snapCaja = ultimoLog ? Number(ultimoLog.caja_despues || 0) : Number(balanceEliteBJ.cG || 0);
    
    const productoEnAlmacen = productos.find(p => p.id === ventaOriginal.producto_id);
    const dineroAReversar = Number(ventaOriginal.monto_efectivo || 0) + Number(ventaOriginal.monto_yape || 0);

    try {
      if (productoEnAlmacen) {
        await supabase.from('productos').update({ 
          stock: Number(productoEnAlmacen.stock) + Number(ventaOriginal.cantidad) 
        }).eq('id', productoEnAlmacen.id);
      }

      if (dineroAReversar > 0) {
        await supabase.from('auditoria_bj').insert([{
          cliente: ventaOriginal.cliente_nombre,
          operacion: 'ANULACIÓN / DEVOLUCIÓN',
          detalles: `Reversión de pago: -S/ ${dineroAReversar} por anulación de venta`,
          monto_operacion: -dineroAReversar,
          caja_antes: snapCaja,
          caja_despues: snapCaja - dineroAReversar
        }]);
      }

      await supabase.from('ventas').update({
        estado_pedido: 'Anulado',
        monto_efectivo: 0, monto_yape: 0, saldo_pendiente: 0, ganancia_total: 0
      }).eq('id', ventaOriginal.id);

      await cargarTodoDesdeNube();
      alert("Operación anulada y rastro registrado en bitácora.");
    } catch (e) {
      console.error("Fallo en la anulación:", e);
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
      
      // 1. Insertamos el producto
      const { data, error } = await supabase.from('productos').insert([formProd]).select(); 
      
      if (!error && data) {
          // 2. 🚀 REGISTRO AUTOMÁTICO EN EL HISTORIAL DE ENTRADAS
          await supabase.from('movimientos_stock_bj').insert([
              {
                  producto_nombre: formProd.nombre,
                  cantidad_agregada: Number(formProd.stock),
                  tipo_movimiento: 'NUEVO INGRESO'
              }
          ]);

          setFormProd({nombre:'', precio_compra:'', precio_venta:'', precio_menor:'', stock:'', colores:''}); 
          cargarTodoDesdeNube(); 
      }
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
    try {
        // 1. Buscamos el nombre del producto en el estado local para el historial
        const productoEncontrado = productos.find(p => p.id === id);
        const nombreParaRegistro = productoEncontrado ? productoEncontrado.nombre : 'Producto Sin Nombre';

        // 2. Actualizamos el stock en la tabla principal (lo que ya hacías)
        const { error: errorUpdate } = await supabase
            .from('productos')
            .update({ stock: Number(s) })
            .eq('id', id);

        if (errorUpdate) throw errorUpdate;

        // 3. PASO NUEVO: Insertamos el registro en la bitácora de movimientos
        // Esto alimentará el Box de "Entradas" en tu Almacén
        const { error: errorMov } = await supabase
            .from('movimientos_stock_bj')
            .insert([
                {
                    producto_nombre: nombreParaRegistro,
                    cantidad_agregada: Number(s), // Registra el valor que ingresaste en el cuadro
                    tipo_movimiento: 'ENTRADA / AJUSTE'
                }
            ]);

        if (errorMov) throw errorMov;

        // 4. Refrescamos la vista para ver los cambios reflejados
        cargarTodoDesdeNube();

    } catch (error) {
        console.error("Error completo en sincronización:", error);
        alert("❌ Error al registrar el movimiento en el Búnker");
    }
};

  // ==========================================
  // 10. FUNCIONES: LOGÍSTICA (COBRANZAS)
  // ==========================================
 const handleCobrarDeudaBJ = async (g, montoCobrado) => { 
    const saldoACobrar = Number(montoCobrado || 0);

    if (!g.isSoloEntrega && saldoACobrar <= 0) {
        return alert("Ingresa un monto válido");
    }
    
    // 🛡️ CORRECCIÓN DE SALDO EN COBRANZA
    const ultimoLog = auditoriaLogs[0];
    const preCaja = ultimoLog ? Number(ultimoLog.caja_despues || 0) : Number(balanceEliteBJ?.cG || 0);

    try {
        for(let i = 0; i < g.items_ids.length; i++) {
            await supabase.from('ventas').update({
                estado_pedido: 'Entregado',
                saldo_pendiente: 0,
                monto_efectivo: i === 0 ? (Number(g.items[i].monto_efectivo || 0) + saldoACobrar) : Number(g.items[i].monto_efectivo || 0)
            }).eq('id', g.items_ids[i]);
        } 
        
        // 🛡️ REGISTRO OBLIGATORIO EN BITÁCORA CORRELATIVO
        await supabase.from('auditoria_bj').insert([{
            cliente: g.cliente,
            operacion: 'COBRO SALDO CRÉDITO',
            detalles: `Cobro de deuda en BJ Importaciones: S/ ${saldoACobrar}`,
            monto_operacion: saldoACobrar,
            caja_antes: preCaja,
            caja_despues: preCaja + saldoACobrar 
        }]);

        await cargarTodoDesdeNube(); 
    } catch (e) { alert("Error al registrar cobro"); }
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
      
      // FIX: Detectamos si es ingreso por la palabra, no por el emoji
      const esIngreso = formFinanzas.tipo?.toLowerCase().includes('ingreso') || formFinanzas.tipo?.toLowerCase().includes('inversión');
      const delta = esIngreso ? mF : -mF; 
      
      // 🛡️ CORRECCIÓN DE SALDO VIVO EN GASTOS/RETIROS:
      // Leemos el saldo real del último movimiento escrito en la bitácora
      const ultimoLog = auditoriaLogs[0];
      const preCaja = ultimoLog ? Number(ultimoLog.caja_despues || 0) : Number(balanceEliteBJ.cG || 0);

      const { error } = await supabase.from('finanzas').insert([{ ...formFinanzas, monto: mF }]);
      
      if (!error) {
          // Escribe en la bitácora forense sumando o restando directamente sobre el saldo vivo
          await supabase.from('auditoria_bj').insert([{ 
              cliente: 'ADMINISTRATIVO', 
              operacion: formFinanzas.tipo.toUpperCase(), 
              monto_operacion: delta, 
              caja_antes: preCaja, 
              caja_despues: preCaja + delta // Resta o suma con precisión matemática pura
          }]);
          
          // IMPORTANTE: Resetear con el nombre exacto que usas en el select
          setFormFinanzas({ tipo: '🏠 Gastos Local', descripcion: '', monto: '' });
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
    <div style={{ minHeight: '100vh', backgroundColor: '#f1f5f9' }}>
      
      {/* 📱 NAVEGACIÓN MÓVIL (Visible solo en celulares por CSS) */}
      <nav className="nav-mobile" style={{ display: 'none' }}>
        {[
          {id: 'ventas', icon: '💰', label: 'VENTAS'},
          {id: 'stock', icon: '📦', label: 'ALMACÉN'},
          {id: 'logistica', icon: '🚚', label: 'ENVÍOS'},
          {id: 'finanzas', icon: '📊', label: 'REPORTES'}
        ].map(t => (
          <button 
            key={t.id} 
            onClick={() => {
              if(window.navigator.vibrate) window.navigator.vibrate(20);
              setVista(t.id);
            }}
            style={{ 
              background: 'none', border: 'none', 
              color: vista === t.id ? FUCSIA_PRINCIPAL : '#94A3B8', 
              display: 'flex', flexDirection: 'column', alignItems: 'center' 
            }}
          >
            <span style={{ fontSize: '22px' }}>{t.icon}</span>
            <span style={{ fontSize: '9px', fontWeight: '800' }}>{t.label}</span>
          </button>
        ))}
      </nav>

      {/* 💻 HEADER (Escritorio y Global) */}
      <header style={{ backgroundColor: '#ffffff', padding: '10px 5%', position: 'sticky', top: 0, zIndex: 1000, boxShadow: `0 4px 15px rgba(0,0,0,0.06)` }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ backgroundColor: FUCSIA_PRINCIPAL, color: '#fff', width: '38px', height: '38px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '14px' }}>BJ</div>
              <h1 style={{ margin: 0, fontSize: '0.9rem', fontWeight: '900', color: FUCSIA_PRINCIPAL }}>BJ IMPORTACIONES</h1>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <small style={{ fontSize: '10px', fontWeight: '900', opacity: 0.4 }}>BÚNKER v6.0</small>
                <button onClick={cerrarSesion} style={{ backgroundColor: '#FEF2F2', color: ROJO_BJ, border: `1px solid ${ROJO_BJ}50`, padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', fontWeight: '900', fontSize: '11px' }}>
                    BLOQUEAR 🔒
                </button>
            </div>
          </div>
          
          <nav className="header-desktop" style={{ display: 'flex', gap: '5px', overflowX: 'auto', paddingBottom: '5px' }}>
            {['ventas', 'stock', 'logistica', 'finanzas', 'clientes', 'contabilidad'].map(t => (
              <button 
                key={t} 
                onClick={() => setVista(t)} 
                style={{ 
                    flex: '0 0 auto', 
                    backgroundColor: vista === t ? FUCSIA_PRINCIPAL : '#FCA5D415', 
                    border: 'none', 
                    color: vista === t ? '#fff' : FUCSIA_PRINCIPAL, 
                    padding: '12px 18px', borderRadius: '12px', cursor: 'pointer', fontWeight: '900', fontSize: '11px' 
                }}
              >
                {t === 'contabilidad' ? 'GESTIÓN' : (t === 'clientes' ? 'CRM' : t.toUpperCase())}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* 📦 RENDERIZADO DE CONTENIDO (CON SKELETON UI) */}
      <main style={{ maxWidth: '1400px', margin: 'auto', padding: '20px' }}>
        {cargando ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="skeleton" style={{ height: '80px', width: '100%' }}></div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
               <div className="skeleton" style={{ height: '400px' }}></div>
               <div className="skeleton" style={{ height: '400px' }}></div>
            </div>
          </div>
        ) : (
          <>
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
                formProd, setFormProd, handleAddProductoBJ, productos, 
                busquedaStock, setBusquedaStock, 
                idEditProducto, setIdEditProducto, formEditProducto, setFormEditProducto, 
                handleUpdateProductoBJ, handleDeleteProductoBJ, formEditStockBJ, 
                setFormEditStockBJ, handleSincronizarStockBJ, movimientosStock, fechaConsulta, setFechaConsulta,
                historialVentasDiaBJ, 
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
                    ventas, productos, finanzas, balanceEliteBJ, valorizacionStockBJ, resumenGastosBJ,
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
                    formFinanzas, setFormFinanzas, idEditFinanza, setIdEditFinanza, 
                    formEditFinanza, setFormEditFinanza, handleUpdateFinanzaBJ,
                    FUCSIA_PRINCIPAL, VERDE_BJ, ROJO_BJ, AMARILLO_BJ, OSCURO_BJ, styleInp, styleCrd 
                }} />
            )}
          </>
        )}
      </main>
    </div>
  );
}
