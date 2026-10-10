const assert = require('node:assert/strict');
const { test } = require('node:test');
const { resolveBarangay } = require('../server/location-geocoder');

const barangays = ['Poblacion', 'Barobo', 'Batangan'];

test('reverse geocoder resolves only an exact canonical Valencia barangay', () => {
  const place = {
    address: {
      country_code: 'ph',
      city: 'Valencia City',
      state_district: 'Bukidnon',
      suburb: 'Brgy. Barobo',
    },
  };

  assert.equal(resolveBarangay(place, barangays), 'Barobo');
});

test('reverse geocoder does not infer barangays from proximity or names outside Valencia', () => {
  const unknownBarangay = {
    address: {
      country_code: 'ph',
      municipality: 'Valencia',
      province: 'Bukidnon',
      suburb: 'Near Barobo',
    },
  };
  const otherCity = {
    address: {
      country_code: 'ph',
      city: 'Malaybalay City',
      province: 'Bukidnon',
      suburb: 'Poblacion',
    },
  };

  assert.equal(resolveBarangay(unknownBarangay, barangays), null);
  assert.equal(resolveBarangay(otherCity, barangays), null);
  assert.equal(resolveBarangay(null, barangays), null);
});
