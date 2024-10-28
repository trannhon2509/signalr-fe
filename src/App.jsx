import './App.css';
import axios from 'axios';
import { useEffect, useState } from 'react';
import * as signalR from '@microsoft/signalr';
import { Button, Modal, Form, Table } from 'react-bootstrap';
import ReactPaginate from 'react-paginate';
import UserRow from './UserRow';

const API_BASE_URL = 'http://localhost:5213/api/User';
const SIGNALR_HUB_URL = 'http://localhost:5213/userhub';
const PAGE_SIZE = 4;

function App() {
  const [users, setUsers] = useState([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [skipSignalR, setSkipSignalR] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchUsers(pageNumber);
    setupSignalRConnection();
  }, [pageNumber]);

  const fetchUsers = async (page) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/paged`, {
        params: { pageNumber: page, pageSize: PAGE_SIZE }
      });
      setUsers(response.data.data);
      setTotalPages(response.data.totalPages);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const setupSignalRConnection = () => {
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(SIGNALR_HUB_URL)
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Information)
      .build();

    connection.start()
      .then(() => {
        connection.on('UserCreated', (newUser) => {
          if (skipSignalR) {
            setSkipSignalR(false);
            return;
          }
          setUsers(prevUsers => {
            const userExists = prevUsers.some(user => user.id === newUser.id);
            if (!userExists) {
              return [...prevUsers, newUser];
            }
            return prevUsers;
          });
        });

        connection.on('UserUpdated', (updatedUser) => {
          if (skipSignalR) {
            setSkipSignalR(false);
            return;
          }
          setUsers(prevUsers => prevUsers.map(user =>
            user.id === updatedUser.id ? updatedUser : user
          ));
        });

        connection.on('UserDeleted', (deletedUserId) => {
          setUsers(prevUsers => prevUsers.filter(user => user.id !== deletedUserId));
          // Chuyển về trang trước nếu xóa người dùng cuối cùng của trang hiện tại
          setPageNumber(prevPageNumber => {
            if (users.length === 1 && prevPageNumber > 1) {
              return prevPageNumber - 1;
            }
            return prevPageNumber;
          });
        });
      })
      .catch(error => console.error('Error connecting to SignalR hub:', error));
  };

  const handleCreateUser = () => {
    setIsEditing(false);
    setName('');
    setEmail('');
    setShowModal(true);
  };

  const handleEditUser = (user) => {
    setIsEditing(true);
    setCurrentUserId(user.id);
    setName(user.name);
    setEmail(user.email);
    setShowModal(true);
  };

  const handleSaveUser = async () => {
    if (isEditing) {
      // Update existing user
      try {
        const updatedUser = { name, email };
        setSkipSignalR(true);
        await axios.put(`${API_BASE_URL}/${currentUserId}`, updatedUser);
        setUsers(prevUsers =>
          prevUsers.map(user =>
            user.id === currentUserId ? { ...user, name, email } : user
          )
        );
        setShowModal(false);
      } catch (error) {
        console.error('Error updating user:', error);
      }
    } else {
      // Create new user
      try {
        const newUser = { name, email };
        setSkipSignalR(true);
        await axios.post(API_BASE_URL, newUser);

        if (users.length + 1 > PAGE_SIZE) {
          const newPageNumber = totalPages + 1;
          setPageNumber(newPageNumber);
          fetchUsers(newPageNumber);
        } else {
          fetchUsers(pageNumber);
        }

        setShowModal(false);
      } catch (error) {
        console.error('Error creating user:', error);
      }
    }
  };


  const handleDeleteUser = async (id) => {
    try {
      await axios.delete(`${API_BASE_URL}/${id}`);
      setUsers(prevUsers => prevUsers.filter(user => user.id !== id));
      // Chuyển về trang trước nếu xóa người dùng cuối cùng của trang hiện tại
      setPageNumber(prevPageNumber => {
        if (users.length === 1 && prevPageNumber > 1) {
          return prevPageNumber - 1;
        }
        return prevPageNumber;
      });
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  const handlePageClick = (data) => {
    setPageNumber(data.selected + 1);
  };

  return (
    <div className="App">
      <h1 className="app-title">User Management</h1>
      <div className="user-container">
        <Button onClick={handleCreateUser} variant="primary" className="mb-4">Create New User</Button>
        <Table striped bordered hover>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <UserRow
                key={user.id}
                user={user}
                onEdit={handleEditUser}
                onDelete={handleDeleteUser}
              />
            ))}
          </tbody>
        </Table>

        <ReactPaginate
          previousLabel={'«'}
          nextLabel={'»'}
          breakLabel={'...'}
          pageCount={totalPages}
          marginPagesDisplayed={2}
          pageRangeDisplayed={3}
          onPageChange={handlePageClick}
          forcePage={pageNumber - 1}
          containerClassName={'pagination'}
          activeClassName={'active'}
          previousClassName={'previous'}
          nextClassName={'next'}
          disabledClassName={'disabled'}
        />
      </div>

      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>{isEditing ? 'Update User' : 'Create New User'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3" controlId="formName">
              <Form.Label>Name</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Form.Group>
            <Form.Group className="mb-3" controlId="formEmail">
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                placeholder="Enter email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Close
          </Button>
          <Button variant="primary" onClick={handleSaveUser}>
            Save Changes
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default App;
