
import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { IdAndLink } from '@/components/IdandLink';

describe('IdandLink Component', () => {
  test('renders IdandLink with correct id and link', () => {
    render( <IdAndLink type="asset" url="https://preview.covia.ai/venues/did%3Aweb%3Amikera1337-covia-space.hf.space/assets/44e9a50dea5a92a2f91f2cdd410dc0e1c5bf5a42fe14280cbbb86c247124ef99" 
    id="44e9a50dea5a92a2f91f2cdd410dc0e1c5bf5a42fe14280cbbb86c247124ef99"/>);
     expect(screen.getByTestId('linkcopy_btn')).toBeInTheDocument();
     expect(screen.getByTestId('idcopy_btn')).toBeInTheDocument();
     console.log(screen.getByTestId('idcopy_btn'))
     expect(screen.getByTestId('idcopy_btn')).toHaveTextContent('did:web:mikera1337-covia-...');
  });


});