import React from 'react'

export function Modal(props: {
  title: string
  onClose: () => void
  children: React.ReactNode
  actions?: React.ReactNode
}) {
  return (
    <div className="modalOverlay" onMouseDown={props.onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modalHeader">
          <h3>{props.title}</h3>
          <button className="btn" onClick={props.onClose}>Κλείσιμο</button>
        </div>
        <div className="hr" />
        {props.children}
        {props.actions ? (
          <>
            <div className="hr" />
            <div className="row" style={{ justifyContent: 'flex-end' }}>
              {props.actions}
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
