import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { auth } from '../config/firebase';

export default function SetupRestaurant() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    gstin: '',
    fssaiNumber: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/restaurant', formData);
      console.log('Restaurant created successfully');

      // Refresh the JWT so the new restaurantId is embedded in the token.
      // Without this, the routing guard sees restaurantId=undefined and loops back to /setup.
      const firebaseUser = auth.currentUser;
      if (firebaseUser) {
        const freshToken = await firebaseUser.getIdToken(true); // force refresh
        await login(freshToken);
      }

      navigate('/');
    } catch (error) {
      console.error('Error creating restaurant:', error);
      alert('Failed to create restaurant. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-cream py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg overflow-hidden border-t-4 border-maroon">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-maroon">
            Setup Your Restaurant
          </h3>
          <div className="mt-2 max-w-xl text-sm text-gray-500">
            <p>Please provide your restaurant details to complete your registration.</p>
          </div>
          <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Restaurant Name
              </label>
              <input
                type="text"
                name="name"
                id="name"
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-saffron focus:border-saffron sm:text-sm"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                Address
              </label>
              <textarea
                name="address"
                id="address"
                rows={3}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-saffron focus:border-saffron sm:text-sm"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                required
              />
            </div>
            <div>
              <label htmlFor="gstin" className="block text-sm font-medium text-gray-700">
                GSTIN
              </label>
              <input
                type="text"
                name="gstin"
                id="gstin"
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-saffron focus:border-saffron sm:text-sm"
                value={formData.gstin}
                onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="fssai" className="block text-sm font-medium text-gray-700">
                FSSAI Number
              </label>
              <input
                type="text"
                name="fssai"
                id="fssai"
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-saffron focus:border-saffron sm:text-sm"
                value={formData.fssaiNumber}
                onChange={(e) => setFormData({ ...formData, fssaiNumber: e.target.value })}
                required
              />
            </div>
            <div className="pt-4">
              <button
                type="submit"
                className="w-full flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-maroon hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-maroon"
              >
                Complete Setup
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
