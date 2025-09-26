import React, { useState } from 'react'
import RoadSystem from './RoadSystem'

// Демонстрационный компонент для тестирования системы дорог
const RoadDemo: React.FC = () => {
  const [links, setLinks] = useState<Array<{
    id: string
    from_object_id: string
    to_object_id: string
    link_type: 'primary' | 'secondary'
    created_at: string
  }>>([
    {
      id: 'link-1',
      from_object_id: 'obj-1',
      to_object_id: 'obj-2',
      link_type: 'primary',
      created_at: new Date().toISOString()
    },
    {
      id: 'link-2',
      from_object_id: 'obj-2',
      to_object_id: 'obj-3',
      link_type: 'secondary',
      created_at: new Date().toISOString()
    }
  ])

  const [zoneObjects, setZoneObjects] = useState<Array<{
    id: string
    q: number
    r: number
    object_type?: string
  }>>([
    { id: 'obj-1', q: 0, r: 0, object_type: 'building' },
    { id: 'obj-2', q: 2, r: 1, object_type: 'building' },
    { id: 'obj-3', q: 4, r: 0, object_type: 'building' }
  ])

  const addRandomLink = () => {
    const newLink = {
      id: `link-${Date.now()}`,
      from_object_id: `obj-${Math.floor(Math.random() * zoneObjects.length) + 1}`,
      to_object_id: `obj-${Math.floor(Math.random() * zoneObjects.length) + 1}`,
      link_type: Math.random() > 0.5 ? 'primary' : 'secondary' as 'primary' | 'secondary',
      created_at: new Date().toISOString()
    }
    setLinks(prev => [...prev, newLink])
  }

  const addRandomObject = () => {
    const newObject = {
      id: `obj-${Date.now()}`,
      q: Math.floor(Math.random() * 10) - 5,
      r: Math.floor(Math.random() * 10) - 5,
      object_type: 'building'
    }
    setZoneObjects(prev => [...prev, newObject])
  }

  const clearAll = () => {
    setLinks([])
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2>🚗 Road System Demo</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <button onClick={addRandomLink} style={{ marginRight: '10px' }}>
          Add Random Link
        </button>
        <button onClick={addRandomObject} style={{ marginRight: '10px' }}>
          Add Random Object
        </button>
        <button onClick={clearAll}>
          Clear All Links
        </button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Current Objects:</h3>
        <ul>
          {zoneObjects.map(obj => (
            <li key={obj.id}>
              {obj.id}: ({obj.q}, {obj.r})
            </li>
          ))}
        </ul>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Current Links:</h3>
        <ul>
          {links.map(link => (
            <li key={link.id}>
              {link.from_object_id} → {link.to_object_id} ({link.link_type})
            </li>
          ))}
        </ul>
      </div>

      <div style={{ 
        width: '800px', 
        height: '600px', 
        border: '1px solid #ccc',
        position: 'relative',
        backgroundColor: '#f0f0f0'
      }}>
        <RoadSystem links={links} zoneObjects={zoneObjects} />
      </div>
    </div>
  )
}

export default RoadDemo
