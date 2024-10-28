import React, { memo } from 'react';
import { Button } from 'react-bootstrap';
import './App.css'

const UserRow = memo(({ user, onEdit, onDelete }) => {
    return (
        <tr key={user.id}>
            <td>{user.id}</td>
            <td>{user.name}</td>
            <td>{user.email}</td>
            <td>
                <Button onClick={() => onEdit(user)} variant="warning" className="me-2">Update</Button>
                <Button onClick={() => onDelete(user.id)} variant="danger">Delete</Button>
            </td>
        </tr>
    );
});

export default UserRow;
