import React from 'react';
import { useParams, useLocation } from 'react-router-dom';
import EmployeeForm from '../pages/EmployeeForm';

export default function EditViewEmployee() {
  const location = useLocation();
  const isView = location.pathname.includes('/view-employee');
  
  return <EmployeeForm mode={isView ? 'view' : 'edit'} />;
}
